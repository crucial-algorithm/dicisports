FROM node:24-bullseye-slim as base

RUN mkdir /app
WORKDIR /app

ADD index.js ./

ENV PORT=80
EXPOSE 80

CMD ["node", "index.js"]
