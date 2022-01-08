import React from 'react'
import HTMLId from '~/utils/HTMLId'
import Label from '~/components/underground/Label'
import InputBase from '~/components/underground/InputBase'

type Props = {
  name: string
  label: string
  placeholder?: string
  defaultValue?: any
  adornment?: React.ReactNode
  onChange?: (value: any) => void
}
const TextField: React.FC<Props> = ({
  label,
  name,
  placeholder,
  defaultValue,
  onChange,
  adornment
}) => {
  const id = HTMLId()
  if (!adornment)
    return (
      <>
        <Label id={id}>{label}</Label>
        <InputBase
          name={name}
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          type="text"
        />
      </>
    )

  return (
    <>
      <Label id={id}>{label}</Label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <InputBase
          name={name}
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          type="text"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {adornment}
        </div>
      </div>
    </>
  )
}

export default TextField
