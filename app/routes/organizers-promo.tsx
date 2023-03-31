import { ButtonLink } from '~/components/shared/Button';
import Main from '~/components/shared/Main';
import { IsUserAuthenticated, IsUserUnAuthenticated } from '~/components/shared/Roles';
import { H1, H3 } from '~/components/shared/typography';

export default function OrganizersLandingPage() {
  return (
    <Main>
      <H1 className="mb-8">Vamos-te ajudar a crescer o teu evento</H1>
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
