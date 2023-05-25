import { useTranslation } from 'react-i18next';

import type { Language } from '~/types';

export default function useLang() {
  const { i18n } = useTranslation();

  return i18n.language as Language;
}
