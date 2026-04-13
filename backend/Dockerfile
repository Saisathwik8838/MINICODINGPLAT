FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache curl openssl

ENV PRISMA_CLI_BINARY_TARGETS="linux-musl,linux-musl-openssl-3.0.x"
ENV NODE_OPTIONS="--no-warnings"
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

COPY src ./src/
COPY public ./public/

EXPOSE 5000

CMD ["node", "src/server.js"]
