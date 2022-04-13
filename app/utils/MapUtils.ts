import { DiciLocation } from '~/types'

const MAP_BOX_URL = 'api.mapbox.com/geocoding/v5/mapbox.places'
const types = [
  'address',
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality'
]

type MapBoxFeature = {
  text: string
  place_name: string
  center: Array<string>
  context: Array<{ id: string; wikidata?: string; text: string }>
}

function processMapBoxFeature(feature: MapBoxFeature): DiciLocation {
  const { text, place_name, context, center } = feature
  const [lng, lat] = center
  const output: DiciLocation = {
    coords: `${lat},${lng}`,
    shortAddress: text,
    address: place_name,
    postcode: null,
    place: null,
    region: null,
    country: null
  }

  if (!Array.isArray(context)) return output

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

class MapUtils {
  token?: string

  constructor(token?: string) {
    this.token = token
  }

  async searchCityInMapBox(searchTerm: string): Promise<Array<DiciLocation>> {
    if (!searchTerm) return []
    const url = `https://${MAP_BOX_URL}/${searchTerm}.json?limit=5&country=pt&types=${types.join(
      '%2C'
    )}&access_token=${this.token}`
    const res = await fetch(url)
    const json = await res.json()
    const features: Array<MapBoxFeature> | null = json.features || null
    if (features === null) return []
    return features.map(processMapBoxFeature).filter((v) => !!v.region)
  }
}

export default MapUtils
