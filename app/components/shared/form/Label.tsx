import React from 'react'

type Props = {
  id: string
}
const Label: React.FC<Props> = ({ id, children }) => (
  <label htmlFor={id} className="block text-sm font-medium text-gray-700">
    {children}
  </label>
)

export default Label
