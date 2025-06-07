FROM node:24-bullseye-slim as base

RUN mkdir /app
WORKDIR /app

ADD index.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]