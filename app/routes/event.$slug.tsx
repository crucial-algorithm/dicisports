import type { LoaderFunction } from 'remix';

import { json, redirect } from 'remix';
import { useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import { useTranslation } from 'react-i18next';

import { findEventBySlug } from '~/server/db/events.server';

import Main from '~/components/shared/Main';
import { H2 } from '~/components/shared/typography';

type LoaderData = {
  event: Event;
};

export const loader: LoaderFunction = async ({ params }) => {
  const slug = params.slug as string;

  if (!slug) {
    redirect('/');
  }

  return json({
    event: await findEventBySlug(slug)
  });
};

export default function EventDisplayRoute() {
  const { event } = useLoaderData<LoaderData>();
  //TODO: change this, add another form
  const { t } = useTranslation('create-event-form');

  if (event.status !== Status.published) {
    //TODO: changed return value

    return redirect('/');
  }
  console.log(event);
  return (
    <Main>
      <H2 className="text-sp-light-blue-900 mb-4 justify-between">
        <b>{event.name}</b>
      </H2>
    </Main>
  );
}
