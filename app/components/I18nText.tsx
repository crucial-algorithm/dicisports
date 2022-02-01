import { useTranslation } from 'react-i18next'
import { Language, TranslationObject } from '~/types'

export default function I18nText({
  text
}: {
  text: TranslationObject
}): string {
  const { i18n } = useTranslation()
  return text ? text[i18n.language as Language] : ''
}
