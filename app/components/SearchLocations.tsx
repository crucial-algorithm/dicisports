import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { inputBaseClasses } from '~/components/shared/form/InputBase'
import * as React from 'react'
import { Location } from '~/types'
import Select from 'react-select'
import { useTheme } from '~/utils/theme-provider'

type SearchLocationsProps = {
  placeholder?: string
  ariaLabel?: string
  onSelect: (option: Location) => void
  defaultValue?: string
  cities: Location[] | undefined
} & Exclude<React.ComponentProps<'select'>, 'onSelect'>

export default function SearchLocations({
  cities,
  ariaLabel,
  className,
  placeholder,
  defaultValue,
  onSelect
}: SearchLocationsProps) {
  const { t } = useTranslation('home')
  const [theme] = useTheme()
  const inDarkMode = theme === 'dark'

  return (
    <>
      <Select
        aria-label={ariaLabel}
        className={inputBaseClasses(className)}
        defaultValue={defaultValue}
        isClearable={false}
        isSearchable={true}
        backspaceRemovesValue={true}
        noOptionsMessage={() => (
          <div style={{ textAlign: 'start' }}> {t('No Cities')}</div>
        )}
        placeholder={placeholder}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null
        }}
        // @ts-ignore
        options={
          cities
            ? cities.map((c) => {
                return {
                  value: c.id,
                  label: `${c.city}, ${c.region}`
                }
              })
            : []
        }
        // @ts-ignore
        onChange={(v: { value: number; label: string }) => {
          const location = (cities || []).find((c) => c.id === v.value)
          if (location) onSelect(location)
        }}
        styles={{
          control: (base) => {
            return {
              ...base,
              backgroundColor: undefined,
              border: 0,
              boxShadow: 'none'
            }
          },
          input: (base) => {
            return {
              ...base,
              color: 'var(--color-blueGray-500)',
              outline: 'none'
            }
          },
          menu: (base) => {
            return {
              ...base,
              borderRadius: 0,
              borderTopLeftRadius: 4,
              backgroundColor: inDarkMode
                ? 'var(--color-gray-800)'
                : 'var(--color-gray-100)'
            }
          },
          option: (base, { isFocused }) => {
            return {
              ...base,
              color: inDarkMode
                ? 'var(--color-blueGray-500)'
                : 'var(--color-gray-500)',
              backgroundColor:
                isFocused === false
                  ? undefined
                  : inDarkMode
                  ? 'var(--color-gray-600)'
                  : 'var(--color-gray-200)'
            }
          },
          singleValue: (base) => {
            return {
              ...base,
              color: inDarkMode
                ? 'var(--color-blueGray-500)'
                : 'var(--color-gray-500)'
            }
          },
          clearIndicator: (base) => {
            return {
              ...base,
              cursor: 'pointer',
              ':hover': {
                color: inDarkMode ? 'var(--color-gray-200)' : 'initial'
              }
            }
          }
        }}
      />
    </>
  )
}
