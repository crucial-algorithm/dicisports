import { ChangeEvent, useState } from 'react'
import { TFunction } from 'i18next'
import InputBase from '~/components/shared/form/InputBase'

export type PickBookingSystemOptions = {
  name: string
  useExternal: boolean | undefined
  url: string | null | undefined
  t: TFunction // ns: create-event-form
}

const Values = {
  External: 'external',
  Internal: 'internal'
}

export default function PickBookingSystem({
  name,
  useExternal = false,
  url = '',
  t
}: PickBookingSystemOptions) {
  const [state, setState] = useState<{
    value: string
    disabled: boolean
  }>({
    value: useExternal ? Values.External : Values.Internal,
    disabled: !useExternal
  })

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setState({
      value: e.target.value,
      disabled: e.target.value === 'internal'
    })
  }

  return (
    <fieldset>
      <div>
        <legend className="text-base font-medium text-gray-900">
          {t('How Is Booking Going To Be Managed')}
        </legend>
        <p className="text-sm text-gray-500">
          These are delivered via SMS to your mobile phone.
        </p>
      </div>
      <div className="mt-4 space-y-4">
        <div className="flex items-center">
          <input
            id={`${name}-internal`}
            name={name}
            type="radio"
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
            defaultChecked={!useExternal}
            onChange={onChange}
            value="internal"
          />
          <label
            htmlFor={`${name}-internal`}
            className="ml-3 block text-sm font-medium text-gray-700"
          >
            {t('Manage Booking in Platform')}
          </label>
        </div>
        <div className="flex items-center">
          <input
            id={`${name}-external`}
            name={name}
            type="radio"
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
            defaultChecked={useExternal}
            onChange={onChange}
            value="external"
          />
          <label
            htmlFor={`${name}-external`}
            className="ml-3 block text-sm font-medium text-gray-700"
          >
            {t('Manage Booking Externally')}
          </label>
        </div>
        <div className="col-span-6 sm:col-span-4">
          <label
            htmlFor="external-url"
            className="block text-sm font-medium text-gray-700"
          >
            {t('Link to External Booking URL')}
          </label>
          <InputBase
            type="text"
            name={`${name}-url`}
            id="external-url"
            autoComplete="email"
            disabled={state.disabled}
            defaultValue={url || ''}
          />
        </div>
      </div>
    </fieldset>
  )
}
