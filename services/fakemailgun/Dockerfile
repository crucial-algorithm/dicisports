# base node image
FROM node:16-bullseye-slim as base

RUN mkdir /app
WORKDIR /app

ADD index.js ./

CMD ["node", "index"]

EXPOSE 8080
