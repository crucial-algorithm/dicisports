import * as React from 'react'
import { useId } from '@reach/auto-id'
import { inputBaseClasses } from '~/components/shared/form/InputBase'
import { TranslationObject } from '~/types'
import I18nText from '~/components/I18nText'
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption
} from '@reach/combobox'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type Option = {
  value: string | number
  label: string | TranslationObject
  extra?: object
}

type Props = {
  options: Array<Option>
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

type AsyncComboProps = {
  placeholder?: string
  ariaLabel?: string
  dataLoader: (searchTerm: string) => Promise<Array<Option>>
  onSelect: (option: Option) => void
  defaultValue?: string
} & Exclude<React.ComponentProps<'select'>, 'onSelect'>

function labelToText(label: string | TranslationObject) {
  return typeof label === 'string' ? label : I18nText({ text: label })
}

function AsyncComboBox({
  dataLoader,
  ariaLabel,
  className,
  placeholder,
  defaultValue,
  onSelect
}: AsyncComboProps) {
  const { t } = useTranslation('common')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [options, setOptions] = useState<Array<Option>>([])
  const [value, setValue] = useState<string>(defaultValue || '')
  const [userPickedAnOption, setUserPickedAnOption] = useState<boolean>(false)

  function applySelection(label: string) {
    const option: Option | undefined = options.find((o) => o.label === label)
    if (!option) return
    onSelect(option)
  }

  useEffect(() => {
    dataLoader(searchTerm).then((options) => setOptions(options))
  }, [searchTerm])

  return (
    <>
      <Combobox
        aria-label={ariaLabel}
        className={className}
        defaultValue={defaultValue}
        onSelect={(label) => {
          setUserPickedAnOption(true)
          setValue(label)
          applySelection(label)
        }}
        onBlurCapture={() => {
          if (userPickedAnOption || options.length === 0) return
          const label = labelToText(options[0].label)
          setValue(label)
          applySelection(label)
        }}
      >
        <ComboboxInput
          className={inputBaseClasses()}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const value = event.target.value
            setUserPickedAnOption(false)
            setValue(value)
            setSearchTerm(value)
          }}
        />
        {options && (
          <ComboboxPopover className="dark:bg-gray-800 dark:text-white opacity-100">
            {options.length > 0 ? (
              <ComboboxList>
                {options.map(({ label, value }) => {
                  const text = labelToText(label)
                  return (
                    <ComboboxOption
                      key={text}
                      value={text}
                      className="text-lg px-11 py-4 dark:hover:bg-gray-700"
                    />
                  )
                })}
              </ComboboxList>
            ) : (
              <span className="px-11 py-4 block text-lg dark:bg-gray-800 dark:text-white font-medium">
                {t('No results found')}
              </span>
            )}
          </ComboboxPopover>
        )}
      </Combobox>
    </>
  )
}

export { AsyncComboBox }
