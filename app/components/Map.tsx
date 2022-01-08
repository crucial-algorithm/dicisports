import * as React from 'react'
import { useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { TFunction } from 'i18next'
import { Dialog } from '@headlessui/react'
import { LocationMarkerIcon } from '@heroicons/react/solid'
import Button from '~/components/Button'

type MapInfo = {
  lat: number
  lng: number
  zoom: number
  address: string | null
}

type MapBoxFeature = {
  text: string
  place_name: string
  context: Array<{ id: string; wikidata?: string; text: string }>
}

type PickedLocation = {
  shortAddress: string
  address: string
  postcode: string | null
  place: string | null
  region: string | null
  country: string | null
}

const MAP_BOX_URL = 'api.mapbox.com/geocoding/v5/mapbox.places'
const MAP_STYLE = 'mapbox://styles/mapbox/streets-v11'
const types = [
  'address',
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality'
]

type MapProps = {
  token: string
  callback: (location: PickedLocation | null) => void
  xtrClass?: string
  placeholder: string
  defaultValue: string | null
}

function Map({
  token,
  callback,
  xtrClass = 'map-container',
  placeholder,
  defaultValue
}: MapProps) {
  const coords = !defaultValue
    ? [41.55118759332092, -8.394039337203793]
    : defaultValue.split(',').map((p) => parseFloat(p))
  const [, setMap] = React.useState<mapboxgl.Map>()
  const [info, setInfo] = React.useState<MapInfo>({
    lat: coords[0],
    lng: coords[1],
    zoom: 15,
    address: placeholder
  })

  const mapNode = React.useRef(null)

  React.useEffect(() => {
    const node = mapNode.current

    if (typeof window === 'undefined' || node === null) return

    // otherwise, create a map instance
    const map = new mapboxgl.Map({
      container: node,
      accessToken: token,
      style: MAP_STYLE,
      center: [info.lng, info.lat],
      zoom: info.zoom,
      boxZoom: true
    })

    // add the button to "center in current location"
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      })
    )

    // save the map object to React.useState
    setMap(map)

    map.on('moveend', () => {
      const center = map.getCenter()
      getAddress(center.lat, center.lng).then((location) => {
        setInfo({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
          address: capitalize(location?.shortAddress || '')
        })
        callback(location)
      })
    })

    map.on('load', () => {})

    const getAddress = async (
      lat: number,
      lng: number
    ): Promise<PickedLocation | null> => {
      const location = [lng, lat].join(',')
      const url = `https://${MAP_BOX_URL}/${location}.json?limit=1&types=${types.join(
        '%2C'
      )}&access_token=${token}`
      const res = await fetch(url)
      const json = await res.json()
      const feature = json.features[0] || null
      if (!feature) return null
      return processMapBoxFeature(feature)
    }

    return () => {
      map.remove()
    }
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <Label label={info.address} />
      <Pin />
      <div ref={mapNode} className={xtrClass} />
    </div>
  )
}

function Pin() {
  return (
    <div className="map-pin">
      <LocationMarkerIcon className="text-black w-8 h-8" />
    </div>
  )
}

function Label({ label }: { label: string | null }) {
  return label ? <div className="map-location-label">{label}</div> : null
}

/**
 * Use use a capitalize implementation so that default label (hint) is not
 * capitalized through the CSS
 * @param str
 */
function capitalize(str: string) {
  if (!str) return str
  return str
    .split(/\s/)
    .map((s) => (s.length > 0 ? (s[0] + '').toUpperCase() + s.slice(1) : ''))
    .join(' ')
}

function processMapBoxFeature(feature: MapBoxFeature): PickedLocation | null {
  const { text, place_name, context } = feature
  const output: PickedLocation = {
    shortAddress: text,
    address: place_name,
    postcode: null,
    place: null,
    region: null,
    country: null
  }

  for (const ctx of context) {
    const { id, text } = ctx
    const key = id.split('.')[0]
    switch (key) {
      case 'postcode':
        output.postcode = text
        break
      case 'place':
        output.place = text
        break
      case 'region':
        output.region = text
        break
      case 'country':
        output.country = text
        break
    }
  }
  return output
}

export type MapDialogProps = {
  token: string
  xtrClass?: string
  open: boolean
  setClosed: () => void
  onPickedLocation: (location: PickedLocation | null) => void
  defaultValue: string | null | undefined
  t: TFunction // ns: common
}

function MapDialog({
  token,
  xtrClass,
  open,
  setClosed,
  onPickedLocation,
  defaultValue = null,
  t
}: MapDialogProps) {
  const handleClose = () => {
    setClosed()
  }
  const cancelButtonRef = useRef(null)

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-10 overflow-y-auto"
      open={open}
      onClose={handleClose}
      initialFocus={cancelButtonRef}
    >
      <div className="w-full h-screen bg-white p-6">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded mx-auto">
          <Dialog.Title
            as="h1"
            className="text-lg antialiased font-semibold p-6"
          >
            {t('Pick Location In Map Title')}
          </Dialog.Title>

          <Map
            defaultValue={defaultValue}
            token={token}
            xtrClass={xtrClass}
            callback={onPickedLocation}
            placeholder={t('Drag Map to Choose a Location Hint')}
          />
          <div className="px-4 py-3 bg-gray-100 text-right sm:px-6 rounded">
            <Button onClick={handleClose} ref={cancelButtonRef}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleClose}>{t('Pick Location Button')}</Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export { Map, MapDialog }
