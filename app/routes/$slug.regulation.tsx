import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import * as React from 'react';
import { useLoaderData } from '@remix-run/react';

import Main from '~/components/shared/Main';

import { CanonicalMeta } from '~/utils/seo';
import { findEventBySlug } from '~/server/db/events.server';
import { findRegulation } from '~/server/documents.server';
import { NotFound } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request, params }) => {
    const t = await i18n.getFixedT(request, 'create-event-form');

    const slug = params.slug as string;
    const event = await findEventBySlug(slug);

    if (!event) {
      throw NotFound(t('No Event'));
    }

    const regulation = await findRegulation(event.id);

    if (!regulation || (regulation && !regulation.content)) {
      throw NotFound(t('No Regulation'));
    }

    return json({
      regulation
    });
};

export default function Privacy() {
  const { regulation } = useLoaderData();

  return (
    <Main>
      <article className="prose dark:prose-invert">
        <div
          data-cy="directions"
          className="dark:text-white text-base mr-2 mt-2 whitespace-pre-line prose"
          dangerouslySetInnerHTML={{ __html: regulation.content || '...' }}
        />
      </article>
    </Main>
  );
}
