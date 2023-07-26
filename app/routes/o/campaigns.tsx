import { useTranslation } from 'react-i18next';

import Main from '~/components/shared/Main';
import { H3, Paragraph } from '~/components/shared/typography';
import UnderConstruction from '~/components/shared/UnderConstruction';

export const handle: { i18n: string[] } = {
  i18n: ['organizer-campaigns']
};

export default function OrganizerCampaignRoute() {
  const { t } = useTranslation('organizer-campaigns');

  return (
    <Main>
      <H3>{t('Campaigns')}</H3>
      <Paragraph className="mb-8">{t('Campaigns Description')}</Paragraph>
      <UnderConstruction className="w-2/3 mb-2 flex align-middle justify-center" />
      <Paragraph className="text-xs w-2/3 text-center">
        {t('Campaigns Under Construction')}
      </Paragraph>
    </Main>
  );
}
