import { useTranslation } from 'react-i18next';

import Main from '~/components/shared/Main';
import { H3, Paragraph } from '~/components/shared/typography';
import UnderConstruction from '~/components/shared/UnderConstruction';

export const handle: { i18n: string[] } = {
  i18n: ['organiser-users']
};

export default function OrganiserUsersRoute() {
  const { t } = useTranslation('organiser-users');

  return (
    <Main>
      <H3>{t('Users')}</H3>
      <Paragraph className="mb-8">{t('Users Description')}</Paragraph>
      <UnderConstruction className="w-2/3 mb-2 flex align-middle justify-center" />
      <Paragraph className="text-xs w-2/3 text-center">
        {t('Users Under Construction')}
      </Paragraph>
    </Main>
  );
}
