# DiciSports

Hosted at [dicisports](https://dicisports.com), but tested @ [dicistg.fly.dev](https://dicistg.fly.dev/).

Built with [Remix](https://remix.run) running on [fly.io](https://fly.io).

## Development

From your terminal:

```sh
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

## get image hash sha256 from the output
docker run -p 127.0.0.1:3000:3000/tcp --env-file .env <image sha256>

# make sure that database connection is set to:
# DATABASE_URL=postgresql://dici:sports@host.docker.internal:6432/dicisports?schema=public&charset=utf8
```


## Developing with a docker container
```bash
docker-compose up
# 1st time it runs, in another terminal
docker-compose run dicisports npx prisma migrate reset
```

Database connection should be:
`DATABASE_URL=postgresql://dici:sports@database:5432/dicisports?schema=public&charset=utf8`

### Limitations
1. Likely, evertyime `prisma` is updated, container will have to be rebuilt.
This is because `npx prisma generate` is executed when container is built.


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
