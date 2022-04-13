import { useTranslation } from 'react-i18next'
import { inputBaseClasses } from '~/components/shared/form/InputBase'
import * as React from 'react'
import { DiciLocation } from '~/types'
import Select from 'react-select/async'
import { useTheme } from '~/utils/theme-provider'
import MapUtils from '~/utils/MapUtils'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'remix'

type SearchLocationsProps = {
  placeholder?: string
  ariaLabel?: string
  onSelect: (option: DiciLocation) => void
  defaultValue?: string
  mapToken: string
} & Exclude<React.ComponentProps<'select'>, 'onSelect'>

export default function SearchLocations({
  ariaLabel,
  className,
  placeholder,
  defaultValue,
  onSelect,
  mapToken
}: SearchLocationsProps) {
  const { t } = useTranslation('home')
  const [theme] = useTheme()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const inDarkMode = theme === 'dark'
  const mapUtils = new MapUtils(mapToken)
  const [params] = useSearchParams()
  const search = params.get('search')

  async function handlerLoadLocations(searchTerm: string) {
    const results = await mapUtils.searchCityInMapBox(searchTerm)
    setSearchTerm(searchTerm)
    if (results === null) return []
    return results.map((l: DiciLocation) => {
      return {
        value: `${l.coords}|${l.address}`,
        label: l.address,
        extra: l
      }
    })
  }

  function handlerLocationChanged(v: {
    value: number
    label: string
    extra: DiciLocation
  }) {
    const { extra } = v
    if (!extra) return
    onSelect(extra)
    setSearchTerm('')
  }

  return (
    <>
      <Select
        /* force re-render to prevent value to stay the same
         * when navigating home after performing a search
         */
        key={`my-select-${search}`}
        aria-label={ariaLabel}
        className={inputBaseClasses(className)}
        classNamePrefix="react-select"
        defaultValue={defaultValue}
        isClearable={false}
        isSearchable={true}
        backspaceRemovesValue={true}
        noOptionsMessage={() => (
          <div style={{ textAlign: 'start' }}>
            {searchTerm.length > 2 ? t('No Cities') : t('Keep Typing')}
          </div>
        )}
        placeholder={search || placeholder}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null
        }}
        loadOptions={handlerLoadLocations}
        // @ts-ignore
        onChange={handlerLocationChanged}
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
