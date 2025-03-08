# Scraped Events Documentation

## Overview

The DiciSports platform supports importing events from external sources through a scraping mechanism. This document outlines how scraped events are processed, including the automatic creation of users and organizers when new organizer names are encountered.

## Event Creation API

Scraped events are created through the `/action/create-event` endpoint. This API accepts event data and handles the creation of all necessary related entities.

## Automatic User and Organizer Creation

When a scraped event includes an organizer name that doesn't exist in the system, the platform automatically:

1. Creates an anonymous user with:
   - A unique ID
   - An auto-generated email in the format `organizer-{userId}@fake.dicisports.com`
   - Default name "Anonymous Athlete"

2. Creates a new organizer entity with:
   - The name provided in the event payload
   - The default logo from configuration (`DEFAULT_ORGANIZER_LOGO`)
   - The email matching the anonymous user
   - Default phone number: 351000000000
   - Default address: "Default Address"
   - Default postal code: "0000-000"
   - Default city: "Default City"
   - Default tax number: 123456789
   - Default contact name: "Default Contact"
   - Default organizer type ID: 1
   - Auto-generated description: "Auto-created organizer for {organizerName}"
   - Status: SCRAPED

## Implementation Details

The system checks for organizer uniqueness by name. If an organizer with the provided name already exists, the existing organizer is used. Otherwise, a new user and organizer are created.

### Code Flow

1. The `create-event.ts` action receives event data with an optional `organizer` field
2. If an organizer name is provided, the system checks if it already exists
3. If no matching organizer is found, the system:
   - Creates an anonymous user
   - Creates a new organizer linked to that user
   - Uses the new user ID for the event creation
4. The event is then created and associated with the appropriate user

## Configuration

The default organizer logo is configured in `config.server.ts` as `DEFAULT_ORGANIZER_LOGO`. This value is used for all automatically created organizers.

## Security Considerations

- Automatically created organizers are set to SCRAPED status
- The anonymous users have limited capabilities
- These auto-created entities are flagged in the system (events have `isScraped: true`)

## Scraped Events API

DiciSports provides an API endpoint for importing external events into the platform. These events are marked as "scraped" and displayed with appropriate UI indicators to users.

### Endpoint

```
POST /action/create-event
```

### Authentication

The endpoint requires a token for authentication:

```json
{
  "token": "YOUR_CREATE_EVENT_TOKEN"
}
```

The token must match the `CREATE_EVENT_TOKEN` environment variable configured in the application.

### Request Format

The request body should be a JSON object with the following structure:

```json
{
  "token": "YOUR_CREATE_EVENT_TOKEN",
  "user": "USER_ID",
  "language": "pt",
  "data": {
    "name": "Event Name",
    "sportId": 1,
    "difficultyId": 1,
    "startAt": "2025-12-31T12:00:00.000Z",
    "placeName": "Event Location",
    "useExternalBooking": true,
    "externalBookingUrl": "https://example.com/booking",
    "description": "Event description...",
    "bibStartingNumber": 1,
    "races": [
      {
        "name": "Race Name",
        "distance": 10,
        "elevationGain": 100,
        "price": 15000,
        "raceDescription": "Race description...",
        "track": null,
        "startTime": 900
      }
    ],
    "regulationPath": null,
    "regulationContent": "<p>Regulation content...</p>",
    "externalWebsite": "https://example.com",
    "perks": {
      "photos": true,
      "prizes": true,
      "shower": false,
      "support": true,
      "insurance": true,
      "food_stations": true,
      "participant_kit": true
    },
    "lat": 38.7223,
    "lng": -9.1393,
    "image1": "cloudinary-image-id-1",
    "image2": "cloudinary-image-id-2",
    "image3": "cloudinary-image-id-3",
    "location": {
      "startPoint": "Starting Point Address",
      "city": "City Name",
      "country": "Country Name",
      "region": "Region Name",
      "zipcode": "1000-100"
    },
    "organizer": "External Organizer Name"
  }
}
```

### Important Fields

- `user`: The ID of the user creating the event (must exist in the system)
- `language`: The language code (e.g., "pt" for Portuguese)
- `data.isScraped`: Automatically set to `true` for events created through this endpoint
- `data.organizer`: The name of the external organizer (displayed in the UI)
- `data.useExternalBooking`: Set to `true` if bookings are handled externally
- `data.externalBookingUrl`: Required if `useExternalBooking` is `true`
- `data.races`: At least one race must be defined

### Response

On success, the endpoint returns the ID of the created event:

```
200 OK
event-id-string
```

### Notes

- Events created through this API are automatically marked as scraped events
- The UI displays appropriate indicators for scraped events:
  - "Non Binding Information" notice
  - "Approximate Location" indicator
  - External organizer attribution
- Prices should be provided in the format: amount × 1000 (e.g., 15€ = 15000)
- Either `regulationPath` or `regulationContent` must be provided, but not both