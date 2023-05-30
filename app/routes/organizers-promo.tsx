import { Role } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';

import { ButtonLink } from '~/components/shared/Button';
import Main from '~/components/shared/Main';
import { IsUserAuthenticated, IsUserUnAuthenticated } from '~/components/shared/Roles';
import { H1, H3 } from '~/components/shared/typography';
import { getUser } from '~/server/auth/session.server';
import { findUserEvents } from '~/server/db/events.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);

  if (!user) {
    return json({});
  }

  const events = await findUserEvents(user.id);

  if (user.role === Role.ORGANIZER) {
    return redirect('/o');
  }

  if (events.length >= 0) {
    return redirect(`/o/event/${events[0].id}`);
  }

  return json({});
};

export default function OrganizersLandingPage() {
  return (
    <Main>
      <H1 className="mb-8">Vamos-te ajudar a fazer crescer o teu evento</H1>
      <H3 className="mb-4">Cria o site do evento de forma fácil e rápida</H3>
      <H3 className="mb-4">Alcança novas audiências</H3>
      <H3 className="mb-4">Controla todo o processo de inscrição</H3>
      <IsUserAuthenticated>
        <ButtonLink to="/o/event/create">Iniciar</ButtonLink>
      </IsUserAuthenticated>
      <IsUserUnAuthenticated>
        <ButtonLink to="/login?a=create-event">Iniciar</ButtonLink>
      </IsUserUnAuthenticated>
  </Main>
  );
}
