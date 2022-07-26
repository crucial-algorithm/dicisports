import type { LoaderFunction} from 'remix';
import { json, redirect } from 'remix'
import { findSports } from '~/server/db/sports.server'
import { findGroupBySlug } from '~/server/db/groups.server'
import { useLoaderData } from '@remix-run/react'
import type { Group, Sport } from '~/types'
import GroupEntry from '~/components/GroupEntry'
import { H2 } from '~/components/shared/typography'

export const handle = {
  i18n: 'm-groups'
}

export let loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.slug as string
  if (!slug) redirect('/')
  return json(
    {
      sports: await findSports(),
      group: await findGroupBySlug(slug)
    }
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
        img={sports.find((s: Sport) => s.id === group.sportId)?.picture}
      />
    </>
  )
}
