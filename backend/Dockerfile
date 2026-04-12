FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY package*.json ./
COPY prisma ./prisma/

# MUST be set BEFORE npm install
ENV PRISMA_CLI_BINARY_TARGETS="native,linux-musl,linux-musl-openssl-3.0.x"
ENV NODE_OPTIONS="--no-warnings"

RUN npm ci --omit=dev && npx prisma generate

COPY src ./src/

EXPOSE 5000

CMD ["node", "src/server.js"]
