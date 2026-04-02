FROM docker:28-cli AS docker-cli

FROM node:20

WORKDIR /usr/src/app

# Use a modern Docker CLI so it can talk to recent Docker Desktop daemons.
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker /usr/local/libexec/docker

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma Client
ENV NODE_OPTIONS="--no-warnings"
RUN npx prisma generate || true

# For a real production app, we would run `npm run build` if using TS.
# Since we converted to JS, we just run directly.

EXPOSE 5000

# We use nodemon for dev or node for prod (default to prod in image)
CMD ["node", "src/server.js"]
