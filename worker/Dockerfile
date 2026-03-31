FROM docker:cli AS docker-cli
FROM node:20-alpine

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Set environment before packages to ensure Prisma builds for correct target
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
ENV NODE_ENV=production

# Copy package files from both backend and worker
COPY backend/package*.json ./backend/
COPY worker/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies  
RUN npm install && npm list @prisma/client

# Verify schema exists
RUN [ -f ./prisma/schema.prisma ] && echo "✓ Prisma schema found" || (echo "✗ Prisma schema missing!" && exit 1)

# Generate Prisma Client with error reporting
RUN npx prisma generate --skip-engine-check 2>&1 | tee /tmp/prisma-gen.log && \
    [ -d node_modules/.prisma/client ] && echo "✓ Prisma client generated" || \
    (echo "✗ Prisma generation failed" && cat /tmp/prisma-gen.log && exit 1)

# Copy worker source files
COPY worker/src ./src/
COPY worker/.env* ./

CMD ["node", "src/worker.js"]
