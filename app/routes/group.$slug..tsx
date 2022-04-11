import { LoaderFunction, redirect } from 'remix'
import CAGResponse from '~/server/response.server'
import { findSports } from '~/server/db/sports.server'
import { findGroupBySlug } from '~/server/db/groups.server'
import { useLoaderData } from '@remix-run/react'
import { Group, Sport } from '~/types'
import GroupEntry from '~/components/GroupEntry'
import { H2 } from '~/components/shared/typography'

export let loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.slug as string
  if (!slug) redirect('/')
  return CAGResponse(
    request,
    {
      sports: await findSports(),
      group: await findGroupBySlug(slug)
    },
    undefined,
    ['m-groups'],
    true
  )
}

export default function GroupDisplayRoute() {
  const { group, sports } = useLoaderData<{ group: Group; sports: Sport[] }>()
  return (
    <>
      <H2 className="text-sp-light-blue-900">
        Precisamos de 1 design para exibir um grupo "sozinho" (para o share)
      </H2>

      <GroupEntry
        group={group}
        img={sports.find((s) => s.id === group.sportId)?.picture}
      />
    </>
  )
}
