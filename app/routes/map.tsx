import Map from '~/components/Map'
import { useLoaderData } from '@remix-run/react'
import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css'
import { LinksFunction } from 'remix'
import routeCss from '~/styles/map.css'

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: mapBoxGlCss
    },
    {
      rel: 'stylesheet',
      href: routeCss
    }
  ]
}

export function loader() {
  return {
    ENV: {
      MAPBOX_TOKEN: process.env.MAPBOX_TOKEN
    }
  }
}

export default function MapRoute() {
  const data = useLoaderData()

  return <Map token={data.ENV.MAPBOX_TOKEN} xtrCss="map-container" />
}
