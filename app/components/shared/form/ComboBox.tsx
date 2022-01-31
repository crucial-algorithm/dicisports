import * as React from 'react'
import { useId } from '@reach/auto-id'
import { inputBaseClasses } from '~/components/shared/form/InputBase'
import { TranslationObject } from '~/types'
import I18nText from '~/components/I18nText'

type Props = {
  options: Array<{ value: string | number; label: string | TranslationObject }>
  defaultValue?: string | number
} & React.ComponentProps<'select'>

export default function ComboBox({
  id,
  name,
  defaultValue,
  className,
  options
}: Props) {
  const generatedId = useId()
  return (
    <select
      name={name}
      id={id || generatedId}
      className={inputBaseClasses(className)}
      defaultValue={defaultValue}
    >
      {options.map((o, i) => (
        <option key={i} value={o.value}>
          {typeof o.label === 'string' ? o.label : I18nText({ text: o.label })}
        </option>
      ))}
    </select>
  )
}
