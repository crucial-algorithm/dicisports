import { useTranslation } from 'react-i18next';

import type { Language, TranslationObject } from '~/types';

export default function I18nText({
  text
}: {
  text: TranslationObject
}) {
  const { i18n } = useTranslation();

  return <>{getI18nText(text, i18n.language as Language)}</>;
}

function getI18nText(text: TranslationObject, language: Language) {
  return text ? text[language] : '';
}

export { getI18nText };
