import * as React from 'react'
import mapboxgl from 'mapbox-gl'
import LocationOnIcon from '@mui/icons-material/LocationOn'

type MapInfo = {
  lat: number
  lng: number
  zoom: number
  address: string | null
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

function Map({ token, xtrCss }: { token: string; xtrCss: string }) {
  const [, setMap] = React.useState<mapboxgl.Map>()
  const [info, setInfo] = React.useState<MapInfo>({
    lat: 41.55118759332092,
    lng: -8.394039337203793,
    zoom: 15,
    address: null
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
      getAddress(center.lat, center.lng).then((address) => {
        setInfo({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
          address: address
        })
      })
    })

    map.on('load', () => {})

    const getAddress = async (
      lat: number,
      lng: number
    ): Promise<string | null> => {
      const location = [lng, lat].join(',')
      const url = `https://${MAP_BOX_URL}/${location}.json?limit=1&types=${types.join(
        '%2C'
      )}&access_token=${token}`
      const res = await fetch(url)
      const json = await res.json()
      const feature = json.features[0] || null
      if (!feature) return null
      return feature.text
    }

    return () => {
      map.remove()
    }
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <Label label={info.address} />
      <Pin />
      <div ref={mapNode} className={xtrCss} />
    </div>
  )
}

function Pin() {
  return (
    <div className="map-pin">
      <LocationOnIcon fontSize="large" />
    </div>
  )
}

function Label({ label }: { label: string | null }) {
  return label ? <div className="map-location-label">{label}</div> : null
}

export default Map
