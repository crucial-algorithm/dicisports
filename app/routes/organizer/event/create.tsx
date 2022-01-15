import type { LoaderFunction } from 'remix'
import { redirect } from 'remix'
import { db } from '~/server/db.server'
import Id from '~/server/utils/Id.server'

export const loader: LoaderFunction = async ({ request }) => {
  const eventId = Id()
  const eventAt = new Date()
  try {
    await db.event.create({
      data: {
        id: eventId,
        name: null,
        sportId: 1,
        startAt: null,
        endAt: null,
        location: null,
        address: null,
        useExternalBooking: false,
        externalBookingUrl: null,
        createdAt: eventAt,
        updatedAt: eventAt
      }
    })
  } catch (err) {
    console.error(err)
  }

  return redirect(`/organizer/event/${eventId}`)
}
