# Welcome to Remix!

- [Remix Docs](https://remix.run/docs)

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
npx prisma migrate dev --name <something-meaningful-that-will-be-assigned-to-folder-name> --create-only
```

This will generate a new migration in `prisma/migrations/<date>_<name given in command>`
