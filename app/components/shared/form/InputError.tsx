import React from 'react'

type Props = {
  id: string
  children?: string | null
} & React.ComponentProps<'div'>
const InputError: React.FC<Props> = ({ id, children }) => {
  if (!children) {
    return null
  }

  return (
    <p role="alert" id={id} className="text-red-500 text-sm mt-4">
      {children}
    </p>
  )
}

export default InputError
