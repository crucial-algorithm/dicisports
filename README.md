# DiciSports

Hosted at [dicisports](https://dicisports.com), but tested @ [dicistg.fly.dev](https://dicistg.fly.dev/).

Built with [Remix](https://remix.run) running on [fly.io](https://fly.io).

## Development

From your terminal:

```sh
npm install
npx tsc --resolveJsonModule --esModuleInterop prisma/seed.ts
mv prisma/seed.js prisma/seed.cjs
npx prisma migrate reset
npx prisma db seed
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### Deploying changes to the database

```sh
npx prisma migrate reset
npx prisma migrate dev --name <something-meaningful-that-will-be-assigned-to-folder-name> --create-only
```

This will generate a new migration in `prisma/migrations/<date>_<name given in command>`

### Upgrading to latest Remix packages
```sh
npm i remix@latest @remix-run/node@latest @remix-run/react@latest @remix-run/serve@latest
npm i -D @remix-run/dev@latest @remix-run/eslint-config@latest
# IF PREVIOUS FAILS do to i18next dependencies
npm i remix-i18next@latest i18next@latest react-i18next@latest i18next-browser-languagedetector@latest @remix-run/dev@latest @remix-run/eslint-config@latest
```

### Upgrading to latest Prisma package
```sh
npm i --save-dev prisma@latest
npm i @prisma/client@latest
```


### When adding new configs to .env
Options need to be added to [github actions](https://github.com/crucial-algorithm/dicisports/settings/secrets/actions) and referenced in the e2e test workflows.

Also, to fly.io (adding multiple is the prefered option)
```shell
flyctl secrets -a <dicistg|diciprd> set VAR_NAME_1=VALUE_1 VAR_NAME_2=VALUE_2
```
Example:
```shell
flyctl secrets -a diciprd set ORGANIZER_REVIEWERS_EMAILS="xxx@dicisports.com,yyyy@dicisports.com"
```

## Testing payments in staging relevant info
**Credit card:** 4350 7900 4997 6222 | Val: 04/24 | CVV: 972

**MbWay:** PIN: 123 123

**Multibanco:** has to be validated manually, so we can test e2e


## Testing docker image locally
```shell
docker build . --no-cache

## get the hash from the output

docker run -p 127.0.0.1:3000:3000/tcp --env-file .env 049365fd3657f495354f35a13cc2096652222eedaa162b9197d0744d2cf980e6
```

## Troubleshooting fly.io
### Restarting database (after finding out it was down)
```shell
#get database id to be used next
fly machine list -a dicistg-db

# Restart
flyctl machine restart 178150df4202d8 -a dicistg-db

# Expected output
Restarting machine 178150df4202d8
  Waiting for 178150df4202d8 to become healthy (started, 3/3)
Machine 178150df4202d8 restarted successfully!
```

### List env variables
fly ssh console -C "printenv" --app diciprd

### Connect to staging/production DB

```shell
flyctl proxy <port> -a <app-name>

# Example
flyctl proxy 5432 -a dicistg-bd
```

### Check app logs
```shell
fly logs -a <app-name>

# Example
fly logs -a dicistg
```

### Scaling Memory
```shell
fly scale memory 1024 -a diciprd
```

## Project Setup in WebStorm

Once all the necessary packages are installed, follow these steps:

1. Open the `node_modules` directory in your WebStorm project.
2. Locate the `.prisma` folder within the `node_modules` directory.
3. Right-click on the `.prisma` folder and choose the option "**_Mark Directory as_**".
4. Select "**_Not Excluded_**".

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
