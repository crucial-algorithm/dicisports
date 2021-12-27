import * as React from 'react'
import mapboxgl from 'mapbox-gl'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

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
}

function Map({ token, callback, xtrClass = 'map-container' }: MapProps) {
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
      getAddress(center.lat, center.lng).then((location) => {
        setInfo({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
          address: location?.shortAddress || ''
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
      <LocationOnIcon fontSize="large" />
    </div>
  )
}

function Label({ label }: { label: string | null }) {
  return label ? <div className="map-location-label">{label}</div> : null
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
}

function MapDialog({
  token,
  xtrClass,
  open,
  setClosed,
  onPickedLocation
}: MapDialogProps) {
  const handleClose = () => {
    setClosed()
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        Selecione a localização no mapa
      </DialogTitle>
      <DialogContent>
        <Map token={token} xtrClass={xtrClass} callback={onPickedLocation} />
      </DialogContent>
      <DialogActions>
        <Button onClick={setClosed}>Cancelar</Button>
        <Button onClick={setClosed} variant="contained" autoFocus>
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export { Map, MapDialog }
