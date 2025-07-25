# SEO Location-Based Routes Architecture

## Overview

This feature implements SEO-friendly routes for location-based event searches, allowing users to find events by sport and location using clean URLs like `/corridas/lisboa` or `/btt/braga`.

## Architecture Components

### 1. Route Handler (`app/routes/($lang).$sport.$location.tsx`)

**URL Pattern**: `/{language}/{sport}/{location}`

**Examples**:
- `/corridas/lisboa` - Running events in Lisbon
- `/pt/btt/braga` - Mountain bike events in Braga
- `/ciclismo/porto` - Cycling events in Porto

**Features**:
- Dynamic route handling with language support
- SEO-optimized meta tags (title, description, keywords, geo tags)
- 30km radius search from location coordinates
- Responsive design with event listings
- Fallback content when no events are found

### 2. SEO Server Functions (`app/server/db/seo.server.ts`)

**Core Functions**:
- `getSportBySlug()` - **Database-driven** sport slug lookup using the new `slug` column
- `getLocationBySlug()` - Maps location slugs to coordinates and regions
- `generateSEORoutes()` - Generates all possible route combinations for sitemap from database

**Database-Driven Sport Slugs**:
- Sports table now includes a localized `slug` JSON column
- No more hardcoded mappings - all sport slugs come from the database
- Supports multiple languages (currently Portuguese, extensible to others)
- Example: `{ "pt": "corridas" }` for running events

**Location Mappings**: 18 Portuguese cities/regions with coordinates for radius search.

### 3. Enhanced Search Function (`app/server/db/search.server.ts`)

**New Function**: `searchEventsBySportAndLocation()`
- Filters events by sport and region
- **Database-level distance calculation** using PostgreSQL's Haversine formula
- 30km radius search when coordinates are available
- Results ordered by distance (closest first) when coordinates provided
- Fallback to region-based search for events without coordinates

### 4. Translation Support (`public/locales/pt/seo.json`)

Localized content for:
- Page titles and descriptions
- Event count messages
- No results messaging
- SEO content sections

### 5. Sitemap Integration (`app/utils/seo-sitemap.server.ts`)

Generates sitemap entries for all sport/location combinations:
- 126 routes (7 sports × 18 locations)
- Weekly update frequency
- Priority 0.7 for SEO

## Implementation Benefits

### SEO Advantages
1. **Clean URLs**: Human-readable, keyword-rich URLs
2. **Geo-targeting**: Location-specific meta tags for local SEO
3. **Content Structure**: Semantic HTML with proper headings
4. **Sitemap Integration**: All routes discoverable by search engines

### User Experience
1. **Fast Loading**: Server-side rendering with optimized queries
2. **Mobile Responsive**: Works on all device sizes
3. **Intuitive Navigation**: Clear breadcrumbs and location context
4. **Helpful Fallbacks**: Suggestions when no events found

### Technical Features
1. **Type Safety**: Full TypeScript support
2. **Error Handling**: 404s for invalid sports/locations
3. **Caching Ready**: Structured for CDN caching
4. **Extensible**: Easy to add new sports/locations

## Usage Examples

### Adding New Sports
1. Add to `SPORT_SLUG_MAPPINGS` in `seo.server.ts`
2. Update database with new sport entry
3. Add translations if needed

### Adding New Locations
1. Add to `LOCATION_SLUG_MAPPINGS` with coordinates
2. Ensure region matches database location format
3. Test radius search functionality

### Customizing Search Radius
Change the radius parameter in the route loader:
```typescript
const { results, total } = await searchEventsBySportAndLocation(
  sport.id,
  location.region,
  location.coordinates,
  50 // Change from 30km to 50km
);
```

## Performance Considerations

1. **Database Indexing**: Ensure indexes on `sport_id`, `location->>'region'`, `lat`, `lng`
2. **Caching**: Consider caching sport/location mappings
3. **Query Optimization**: The search query is optimized for performance
4. **CDN**: Static assets and translations can be CDN cached

## Future Enhancements

1. **Multi-language Support**: Extend to English routes
2. **Dynamic Radius**: Allow users to adjust search radius
3. **Event Density**: Show event density maps
4. **Related Locations**: Suggest nearby locations
5. **Seasonal Content**: Highlight seasonal events

## Testing

Test URLs to verify functionality:
- `/corridas/lisboa` - Should show running events in Lisbon
- `/btt/braga` - Should show MTB events in Braga
- `/invalid/location` - Should return 404
- Check meta tags in browser dev tools
- Verify sitemap includes all routes

## Monitoring

Track these metrics:
- Page load times for location routes
- Search result relevance (events within radius)
- 404 rates for invalid sport/location combinations
- SEO performance in search results
