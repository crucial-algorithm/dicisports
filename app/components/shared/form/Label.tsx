import React from 'react'

type Props = {
  id: string
}
const Label: React.FC<Props> = ({ id, children }) => (
  <label
    htmlFor={id}
    className="inline-block dark:text-blueGray-500 text-gray-500 text-lg"
  >
    {children}
  </label>
)

export default Label
