import { json, LoaderFunction } from 'remix'
import { findCity } from '~/server/db/locations.server'
import { Location } from '~/types'

export const loader: LoaderFunction = async ({ request, params }) => {
  const url = new URL(request.url)
  const term = url.searchParams.get('s')
  let results: Array<Location> = []
  if (term) results = await findCity(term.split(/\s/).join('&'))
  return json(results)
}
