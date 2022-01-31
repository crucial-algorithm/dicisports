import React from 'react'
import clsx from 'clsx'

type Props = {
  onClick?: () => void
  ref?: React.MutableRefObject<null>
  type?: 'button' | 'reset' | 'submit'
  size?: 'medium' | 'large' | 'small'
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
} & React.ComponentProps<'button'>

function classes({ className }: { className?: string }) {
  return clsx(
    'group relative inline-flex transition opacity-100',
    'text-lg font-medium',
    'focus:outline-none disabled:opacity-50',
    className
  )
}

type LinkProps = {} & React.ComponentProps<'button'>

function Link({ children, onClick, className, type }: LinkProps) {
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
  variant = 'primary'
}) => {
  if (variant === 'link')
    return (
      <Link className={className} onClick={onClick} type={type}>
        {children}
      </Link>
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
    >
      <ButtonInner variant={variant} size={size}>
        {children}
      </ButtonInner>
    </button>
  )
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  size?: 'medium' | 'large' | 'small'
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
            'px-6 py-3 space-x-3': size === 'small'
          }
        )}
      >
        {children}
      </div>
    </>
  )
}

export default Button
