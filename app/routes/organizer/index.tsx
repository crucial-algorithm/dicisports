import { Form } from '@remix-run/react';
import type {LinksFunction, LoaderFunction} from 'remix';
import { useTranslation } from 'react-i18next';

import type { Event } from '@prisma/client';
import React from 'react';
import { ButtonLink } from '~/components/shared/Button';
import { H6 } from '~/components/shared/typography';
import Main from '~/components/shared/Main';
import {findEvents} from "~/server/db/events.server";
import {json} from "remix";

type LoaderData = {
  events: Array<Event>;
};

export const handle = {
  i18n: ['common', 'organizer']
};

export const loader: LoaderFunction = async ({ request }) => {
  const events = await findEvents();

  return json({
    events
  });
};

export const links: LinksFunction = () => {
  return [];
};

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('organizer');
  //const { events } = useLoaderData<LoaderData>();

  return (
    <Main>
      <div className="dark:text-blueGray-500">
        <div className="col-span-full mb-12 lg:mb-12">
          <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
            <div />
            <Form method="post" action="/organizer/event/create">
              <ButtonLink variant="secondary" to={'/organizer/event/create'}>
                <H6 as="span">{t('Create')}</H6>
              </ButtonLink>
            </Form>
          </div>
        </div>
      </div>
    </Main>
  );
}
