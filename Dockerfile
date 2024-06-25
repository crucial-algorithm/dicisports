# base node image
FROM node:20-bullseye-slim as base

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

# Install all node_modules, including dev dependencies
FROM base as dev

RUN mkdir /app
WORKDIR /app

ADD package.json package-lock.json ./
RUN npm install --production=false

ADD prisma .
RUN npx prisma generate

ADD . .

CMD ["npm", "run", "dev"]

# Setup production node_modules
FROM base as production

RUN mkdir /app
WORKDIR /app

COPY --from=dev /app/node_modules /app/node_modules
ADD package.json package-lock.json /app/
RUN npm prune --omit=dev

# Build the app
FROM base as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=dev /app/node_modules /app/node_modules

# If we're using Prisma, uncomment to cache the prisma schema
ADD prisma .
RUN npx prisma generate

# app code changes all the time
ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=production /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/build/server /app/build/server
COPY --from=build /app/build/client /app/build/client
ADD . .

CMD ["npm", "run", "start"]
