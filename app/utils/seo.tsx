import type { MetaFunction } from 'remix';

import { useTranslation } from 'react-i18next';

import type { RootLoaderData } from '~/root';
import { getI18nText } from '~/components/I18nText';

import type { Language } from '~/types';

function getOpenGraphMeta({
  url = 'https://dicisports.com',
  title,
  description,
  image = 'https://res.cloudinary.com/dicisports/image/upload/v1663934070/product/og-image-v1.png',
  keywords = ''
}: {
  image?: string;
  url?: string;
  title?: string;
  description?: string;
  keywords?: string;
}) {
  return {
    title,
    description,
    keywords,
    image,
    'og:url': url,
    'og:title': title,
    'og:description': description,
    'og:image': image,
    'og:locale': 'pt_PT',
    'twitter:card': image ? 'summary_large_image' : 'summary',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
    'twitter:alt': title,
    'twitter:url': url,
    'twitter:domain': url
      .replace('https://', '')
      .replace('http://', '')
      .replace(/\/$/, '')
  };
}

// TODO: using useTranslation hook was failing - find other way to access resources and add description to translation
const DEFAULT_DESCRIPTION = 'Dicisports.com é o ponto de encontro de todos os desportistas. Encontra grupos com quem praticar as tuas actividades favoritas. Um só lugar, todos os desportos.';

const CanonicalMeta: MetaFunction = ({ data, params, location, parentsData }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { i18n } = useTranslation();
  const root: RootLoaderData = parentsData.root as RootLoaderData;
  const { searchParams } = new URL(`https://a.com/${location.search}`);
  const sportId = searchParams.get('sport');
  const sport = root.sports.find((s) => s.id === Number(sportId));
  const name = sport ? getI18nText(sport.name, i18n.language as Language) : null;
  const url = `${root.requestInfo.origin}${root.requestInfo.path}${root.requestInfo.path === '/' ? location.search : ''}`;
  const description = sport
    ? `Procuras companhia na tua zona para treinar? Encontra no Dicisports.com groups de ${name?.toLowerCase()} com objetivos parecidos com os teus.`
    : DEFAULT_DESCRIPTION;

  return {
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    ...getOpenGraphMeta({
      title: name ? `Dicisports - ${name}` : 'DiciSports - This Is Sports',
      url,
      description,
      keywords:
        'grupos btt, grupos ciclismo, grupos bicicleta, grupos ebike, grupos atletismo, grupos corrida, grupos trail, grupos gravel, grupos enduro, grupos e-bike, grupos ebike'
    })
  };
};


export { getOpenGraphMeta, CanonicalMeta };
