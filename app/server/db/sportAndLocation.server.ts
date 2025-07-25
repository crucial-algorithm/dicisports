import { db } from '~/server/db.server';
import type { Language, Sport, TranslationObject } from '~/types';

// Location slug mappings for Portuguese cities/regions
const LOCATION_SLUG_MAPPINGS: Record<string, { name: string; region: string; coordinates?: { lat: number; lng: number } }> = {
  'lisboa': { name: 'Lisboa', region: 'Lisbon', coordinates: { lat: 38.7223, lng: -9.1393 } },
  'porto': { name: 'Porto', region: 'Porto', coordinates: { lat: 41.1579, lng: -8.6291 } },
  'braga': { name: 'Braga', region: 'Braga', coordinates: { lat: 41.5518, lng: -8.4229 } },
  'coimbra': { name: 'Coimbra', region: 'Coimbra', coordinates: { lat: 40.2033, lng: -8.4103 } },
  'aveiro': { name: 'Aveiro', region: 'Aveiro', coordinates: { lat: 40.6443, lng: -8.6455 } },
  'faro': { name: 'Faro', region: 'Faro', coordinates: { lat: 37.0194, lng: -7.9322 } },
  'setubal': { name: 'Setúbal', region: 'Setúbal', coordinates: { lat: 38.5244, lng: -8.8882 } },
  'leiria': { name: 'Leiria', region: 'Leiria', coordinates: { lat: 39.7436, lng: -8.8071 } },
  'viseu': { name: 'Viseu', region: 'Viseu', coordinates: { lat: 40.6566, lng: -7.9139 } },
  'santarem': { name: 'Santarém', region: 'Santarém', coordinates: { lat: 39.2362, lng: -8.6859 } },
  'beja': { name: 'Beja', region: 'Beja', coordinates: { lat: 38.0150, lng: -7.8632 } },
  'castelo-branco': { name: 'Castelo Branco', region: 'Castelo Branco', coordinates: { lat: 39.8197, lng: -7.4909 } },
  'evora': { name: 'Évora', region: 'Évora', coordinates: { lat: 38.5664, lng: -7.9065 } },
  'guarda': { name: 'Guarda', region: 'Guarda', coordinates: { lat: 40.5364, lng: -7.2683 } },
  'portalegre': { name: 'Portalegre', region: 'Portalegre', coordinates: { lat: 39.2967, lng: -7.4281 } },
  'viana-do-castelo': { name: 'Viana do Castelo', region: 'Viana do Castelo', coordinates: { lat: 41.6938, lng: -8.8344 } },
  'vila-real': { name: 'Vila Real', region: 'Vila Real', coordinates: { lat: 41.3006, lng: -7.7441 } },
  'braganca': { name: 'Bragança', region: 'Bragança', coordinates: { lat: 41.8066, lng: -6.7578 } }
};

export async function getSportBySlug(slug: string, language: Language): Promise<Sport | null> {
  const sports = await db.sport.findMany();
  
  const sport = sports.find(sport => {
    const sportSlug = sport.slug as TranslationObject;

    return sportSlug && sportSlug[language] === slug;
  });

  if (!sport) {
    return null;
  }

  // Cast the JsonValue to TranslationObject since we know the structure
  return {
    ...sport,
    name: sport.name as any,
    slug: sport.slug as any
  } as Sport;
}

export async function getLocationBySlug(slug: string, language: Language): Promise<{
  name: string;
  slug: string;
  region: string;
  coordinates?: { lat: number; lng: number };
} | null> {
  const locationData = LOCATION_SLUG_MAPPINGS[slug.toLowerCase()];
  
  if (!locationData) {
    return null;
  }

  return {
    name: locationData.name,
    slug,
    region: locationData.region,
    coordinates: locationData.coordinates
  };
}

export function generateLocationSEOData(sport: Sport, location: { name: string; region: string }, language: Language) {
  // This function can be used to generate additional SEO data if needed
  return {
    title: `${sport.name} em ${location.name}`,
    description: `Eventos de ${sport.name} em ${location.name} e região`,
    keywords: [sport.name, location.name, location.region, 'eventos', 'desporto']
  };
}

// Get all available sport slugs for sitemap generation
export async function getAllSportSlugs(language: Language = 'pt'): Promise<string[]> {
  const sports = await db.sport.findMany();

  return sports
    .map(sport => {
      const sportSlug = sport.slug as any;
      
      return sportSlug && sportSlug[language] ? sportSlug[language] : null;
    })
    .filter(Boolean);
}

// Get all available location slugs for sitemap generation
export function getAllLocationSlugs(): string[] {
  return Object.keys(LOCATION_SLUG_MAPPINGS);
}

// Generate all possible sport/location combinations for sitemap
export async function generateSportLocationRoutes(language: Language = 'pt'): Promise<Array<{ sport: string; location: string }>> {
  const routes: Array<{ sport: string; location: string }> = [];
  const sportSlugs = await getAllSportSlugs(language);
  const locationSlugs = getAllLocationSlugs();
  
  for (const sportSlug of sportSlugs) {
    for (const locationSlug of locationSlugs) {
      routes.push({ sport: sportSlug, location: locationSlug });
    }
  }
  
  return routes;
}
