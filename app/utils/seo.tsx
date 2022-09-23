function getOpenGraphMeta({
  url = 'https://dicisports.com',
  title = 'DiciSports - This Is Sports',
  description = 'Dicisports.com é o ponto de encontro de todos os desportistas. Um só lugar, todos os desportos.',
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


export { getOpenGraphMeta };
