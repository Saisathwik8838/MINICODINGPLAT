FROM node:20-alpine

WORKDIR /usr/src/app

# Install all required tools for sandbox + backend
RUN apk add --no-cache \
    docker-cli \
    python3 \
    g++ \
    gcc \
    openjdk17 \
    bash \
    curl \
    openssl

# Environment configs
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl,linux-musl-openssl-3.0.x"
ENV NODE_OPTIONS="--no-warnings"
ENV NODE_ENV=production

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy app source
COPY src ./src/
COPY public ./public/

# ✅ IMPORTANT: create sandbox directories
RUN mkdir -p /usr/src/app/tmp \
    && mkdir -p /usr/src/app/executor

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]