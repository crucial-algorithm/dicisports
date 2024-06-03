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

1. Create a **namespace** for the **container registry** [here](https://console.scaleway.com/registry/namespaces) and follow the fist step - ***Sign in to namespace***.
2. **Build your image**, **tag it** and **push it** to the namespace by doing so:
```bash
# Build image
docker build . -t app-name --no-cache
# Example
docker build . -t dici-stg --no-cache

# Tag image
docker tag dici-stg:tag rg.fr-par.scw.cloud/mynamspace/app-name:tag
# Example
docker tag dici-stg:latest rg.fr-par.scw.cloud/dici-stg/dici-stg:latest

# Push image to Scaleway
docker push rg.fr-par.scw.cloud/mynamespace/app-name:tag
# Example
docker push rg.fr-par.scw.cloud/dici-stg/dici-stg:latest
```

***If something doesn't work, try it with `sudo`.***

3. Go into the **namespace you just created**, click on the "..." of the **image you just pushed** and click "Deploy".
4. In the ***Deployment*** tab, make sure you add all ***Secrets/Environment variables***.

### Setup repository for GitHub Actions
Go into your **repository - Settings - Security/Secrets and variables - Actions - New repository secret** and add the following secrets:
- **SCALEWAY_API_KEY**: If you followed this step by step, when you signed in to the namespace, you already created an API Key. Just get the ***SCW_SECRET_KEY*** value and paste it here.
- **CONTAINER_REGISTRY_ENDPOINT**: Go into your namespace, "Namespace settings" and copy "***Registry endpoint***" value.
- **CONTAINER_ID**: Go into your deployed serverless container. Your url should look something like this: ***console.scaleway.com/containers/namespaces/fr-par/namespace_id/containers/container_id/overview***. Get the ***container_id*** value and paste it into the GHA secret.

### Deploying changes to the database

```sh
npx prisma migrate reset
npx prisma migrate dev --name <something-meaningful-that-will-be-assigned-to-folder-name> --create-only
```

This will generate a new migration in `prisma/migrations/<date>_<name given in command>`

### Upgrading to latest Remix packages
```sh
npm i remix@latest @remix-run/node@latest @remix-run/react@latest @remix-run/serve@latest
npm i -D @remix-run/dev @remix-run/eslint-config
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
