import React from 'react'
import HTMLId from '~/utils/HTMLId'
import Label from '~/components/shared/form/Label'
import InputBase from '~/components/shared/form/InputBase'
import FormField from '~/components/shared/form/FormField'

type Props = {
  name: string
  label: string
  placeholder?: string
  defaultValue?: any
  size?: 'regular' | 'large'
  adornment?: React.ReactNode
  onChange?: (value: any) => void
} & React.ComponentProps<'input'>

const TextField: React.FC<Props> = ({
  label,
  name,
  placeholder,
  defaultValue,
  onChange,
  adornment,
  className,
  readOnly
}) => {
  const id = HTMLId()
  if (!adornment)
    return (
      <FormField>
        <Label id={id}>{label}</Label>
        <InputBase
          name={name}
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          type="text"
          className={className}
          readOnly={readOnly}
        />
      </FormField>
    )

  return (
    <FormField>
      <Label id={id}>{label}</Label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <InputBase
          name={name}
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          type="text"
          className={className}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {adornment}
        </div>
      </div>
    </FormField>
  )
}

export default TextField
