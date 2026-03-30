FROM docker:cli AS docker-cli
FROM node:20-alpine

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY worker/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install

ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

COPY worker/ .

CMD ["node", "src/worker.js"]
