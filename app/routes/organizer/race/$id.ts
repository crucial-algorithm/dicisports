import type { LoaderFunction } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import i18n from '~/server/i18n.server';
import { findRace } from '~/server/db/races.server';

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.id as string;
  const race = await findRace(raceId);

  if (!race) {
    throw new Response(t('No Race'), {
      status: 404
    });
  }

  const body = downloadFromS3(race.track as string);

  //@ts-ignore
  return new Response(body, {
    headers: {
     'content-disposition' : `attachement; filename="${race.name}.gpx"`
    }
  });
};
