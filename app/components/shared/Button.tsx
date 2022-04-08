import React from 'react'
import clsx from 'clsx'
import { Link, LinkProps } from 'remix'

type Props = {
  onClick?: () => void
  ref?: React.MutableRefObject<null>
  type?: 'button' | 'reset' | 'submit'
  size?: 'medium' | 'large' | 'small' | 'tiny'
  variant?: 'primary' | 'secondary' | 'danger' | 'adornment'
} & React.ComponentProps<'button'>

function classes({ className }: { className?: string }) {
  return clsx(
    'group relative inline-flex transition opacity-100',
    'text-lg font-medium',
    'focus:outline-none disabled:opacity-50',
    className
  )
}

function AdornmentButton({
  children,
  onClick,
  className,
  type
}: {} & React.ComponentProps<'button'>) {
  return (
    <button
      onClick={onClick}
      type={type}
      className={clsx(
        'text-lg font-medium text-primary',
        'focus:outline-none disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

const Button: React.FC<Props> = ({
  onClick,
  ref,
  children,
  type = 'submit',
  className,
  disabled,
  size = 'medium',
  variant = 'primary',
  name,
  value
}) => {
  if (variant === 'adornment')
    return (
      <AdornmentButton className={className} onClick={onClick} type={type}>
        {children}
      </AdornmentButton>
    )
  return (
    <button
      type={type}
      className={classes({ className })}
      style={{
        transition:
          'background-color .2s,color .2s,border-color .2s,box-shadow .2s'
      }}
      onClick={onClick}
      ref={ref}
      disabled={disabled}
      name={name}
      value={value}
    >
      <ButtonInner variant={variant} size={size}>
        {children}
      </ButtonInner>
    </button>
  )
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  size?: 'medium' | 'large' | 'small' | 'tiny'
  children: React.ReactNode | React.ReactNode[]
}

function ButtonInner({
  children,
  variant,
  size = 'medium'
}: Pick<ButtonProps, 'children' | 'variant' | 'size'>) {
  return (
    <>
      <div
        className={clsx(
          'focus-ring absolute inset-0 rounded-full opacity-100 disabled:opacity-50 transform transition',
          {
            'border-2 border-secondary bg-primary group-hover:border-transparent group-focus:border-transparent':
              variant === 'secondary' || variant === 'danger',
            danger: variant === 'danger',
            'bg-inverse': variant === 'primary'
          }
        )}
      />

      <div
        className={clsx(
          'relative flex items-center justify-center w-full h-full whitespace-nowrap',
          {
            'text-primary': variant === 'secondary',
            'text-inverse': variant === 'primary',
            'text-red-500': variant === 'danger',
            'px-11 py-6 space-x-5': size === 'large',
            'px-8 py-4 space-x-3': size === 'medium',
            'px-6 py-3 space-x-3': size === 'small',
            'px-2 py-3 space-x-3 w-10 h-10': size === 'tiny'
          }
        )}
      >
        {children}
      </div>
    </>
  )
}

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

const AnchorOrLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & {
    reload?: boolean
    to?: LinkProps['to']
    prefetch?: LinkProps['prefetch']
  }
>(function AnchorOrLink(props, ref) {
  const {
    to,
    href,
    download,
    reload = false,
    prefetch,
    children,
    ...rest
  } = props
  let toUrl = ''
  let shouldUserRegularAnchor = reload || download

  if (!shouldUserRegularAnchor && typeof href === 'string') {
    shouldUserRegularAnchor = href.includes(':') || href.startsWith('#')
  }

  if (!shouldUserRegularAnchor && typeof to === 'string') {
    toUrl = to
    shouldUserRegularAnchor = to.includes(':')
  }

  if (!shouldUserRegularAnchor && typeof to === 'object') {
    toUrl = `${to.pathname ?? ''}${to.hash ? `#${to.hash}` : ''}${
      to.search ? `?${to.search}` : ''
    }`
    shouldUserRegularAnchor = to.pathname?.includes(':')
  }

  if (shouldUserRegularAnchor) {
    return (
      <a {...rest} download={download} href={href ?? toUrl} ref={ref}>
        {children}
      </a>
    )
  } else {
    return (
      <Link prefetch={prefetch} to={to ?? href ?? ''} {...rest} ref={ref}>
        {children}
      </Link>
    )
  }
})

const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithRef<typeof AnchorOrLink> & ButtonProps
>(function ButtonLink(
  { children, variant = 'primary', className, size, ...rest },
  ref
) {
  return (
    <AnchorOrLink ref={ref} className={classes({ className })} {...rest}>
      <ButtonInner size={size} variant={variant}>
        {children}
      </ButtonInner>
    </AnchorOrLink>
  )
})

export default Button

export { ButtonLink }
