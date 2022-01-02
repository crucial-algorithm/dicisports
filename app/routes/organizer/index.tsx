import Box from '@mui/material/Box'
import { useLoaderData } from '@remix-run/react'
import { json, Link, LinksFunction, LoaderFunction } from 'remix'
import { db } from '~/utils/db.server'
import i18n from '~/utils/i18n.server'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import { Status, Event } from '@prisma/client'

type ActionData = {
  formError?: string
  fieldErrors?: {
    name: string | undefined
    content: string | undefined
  }
  fields?: {
    name: string
    content: string
  }
}

type LoaderData = {
  events: Array<Event>
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request }) => {
  const events = await db.event.findMany({
    where: {
      name: { not: Status.draft }
    }
  })

  return json({
    events,
    i18n: await i18n.getTranslations(request, ['organizer'])
  })
}

export const links: LinksFunction = () => {
  return []
}

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('organizer')
  const { events } = useLoaderData<LoaderData>()

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>{t('Name')}</TableCell>
              <TableCell align="right">{t('Location')}</TableCell>
              <TableCell align="right">{t('Date')}</TableCell>
              <TableCell align="right">&nbsp;</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((row) => (
              <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="right">{row.location}</TableCell>
                <TableCell align="right">
                  {row.startAt} - {row.endAt}
                </TableCell>
                <TableCell align="right">
                  <Link to={`event/${row.id}`}>{t('Edit')}</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button type="submit" variant="contained" href="organizer/event/create">
        {t('Create')}
      </Button>
    </Box>
  )
}
