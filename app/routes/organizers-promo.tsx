import { Role } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { ButtonLink } from '~/components/shared/Button';
import DisplayImg from '~/components/shared/DisplayImg';
import Main from '~/components/shared/Main';
import {
  IsUserAuthenticated,
  IsUserUnAuthenticated
} from '~/components/shared/Roles';
import { H3 } from '~/components/shared/typography';
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

  if (events.length > 0) {
    return redirect(`/o/event/${events[0].id}`);
  }

  return json({});
};

export default function OrganizersLandingPage() {
  return (
    <Main className="mx-auto max-w-7xl">
      <div className="relative grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 lg:gap-x-6">
        <H3 className="mb-8 col-span-full">
          Bem-vindo à DiciSports, a plataforma que lhe permite organizar eventos
          desportivos. Pronto para levar os seus eventos para o próximo nível?
          Comece já a aproveitar o poder da DiciSports!
        </H3>
      </div>

      <div className="flex justify-start mb-8">
        <IsUserAuthenticated>
          <ButtonLink to="/o/event/create">Crie a sua prova</ButtonLink>
        </IsUserAuthenticated>
        <IsUserUnAuthenticated>
          <ButtonLink to="/login?a=create-event">Crie a sua prova</ButtonLink>
        </IsUserUnAuthenticated>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 lg:gap-x-6">
        <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark mb-8 col-span-full">
          A DiciSports pretende revolucionar a forma como promove os seus
          eventos e interage com os participantes. Com um interface amigável e
          ferramentas poderosas, facilitamos a gestão de eventos, ajudando-o a
          alcançar novos patamares de sucesso.
        </p>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 lg:gap-x-6 mb-16">
        <div className="col-span-full lg:col-span-6">
          <DisplayImg imageId="product/organizers-1" />
        </div>
        <div className="col-span-full lg:col-span-5 lg:col-start-7">
          <p className="text-xl font-medium md:text-2xl text-black dark:text-white mb-3 mt-3 md:mt-0">
            Porquê a DiciSports?
          </p>
          <div className="flex flex-col gap-8">
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>Alcance uma vasta audiência:</strong> dispomos de uma rede
              de atletas que procura ativamente eventos desportivos. Com a
              DiciSports poderá comunicar com milhares de pessoas que pretendem
              ultrapassar os seus limites e participar em eventos memoráveis.
            </p>
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>Faça uma gestão simplificada:</strong> simplifique o
              processo de gestão de eventos com nossa plataforma intuitiva. Crie
              a página do seu evento, capture inscrições, com várias formas de
              pagamento associadas, e comunique com os participantes,
              economizando tempo e energia.
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 lg:gap-x-6 mx-auto max-w-7xl mb-16">
        <div className="col-span-full lg:mb-0 flex items-start justify-end md:pl-10 lg:col-span-6 lg:col-start-6">
          <DisplayImg imageId="product/organizers-2c" />
        </div>
        <div className="col-span-full pt-6 lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:col-span-5">
          <div className="flex flex-auto flex-col opacity-100 gap-8">
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>Aumente a visibilidade do evento:</strong> destaque os
              aspetos exclusivos da sua prova, incluindo todos os detalhes
              logísticos, mapas dos percursos, descontos, acessibilidades, etc.
              Além da pesquisa segmentada, a nossa plataforma está optimizada
              para motores de busca, tornando mais fácil aos participantes
              descobrir provas e registar-se.
            </p>
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>Comunique com a sua audiência:</strong> as nossas
              ferramentas de comunicação integradas permitem manter os
              participantes informados. Envie informações e lembretes por
              e-mail, garantindo uma experiência perfeita para todos os
              envolvidos.
            </p>
          </div>
        </div>
      </div>

      <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark mb-8">
        Agora que já nos conhece, comece a aproveitar o poder da DiciSports!
      </p>
      <IsUserAuthenticated>
        <ButtonLink to="/o/event/create">Crie a sua prova</ButtonLink>
      </IsUserAuthenticated>
      <IsUserUnAuthenticated>
        <ButtonLink to="/login?a=create-event">Crie a sua prova</ButtonLink>
      </IsUserUnAuthenticated>
    </Main>
  );
}
