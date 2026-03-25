FROM docker:cli AS docker-cli
FROM node:20

# Copy docker CLI from the official docker image to avoid slow apt-get installs
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /usr/src/app

COPY worker/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY worker/ .

CMD ["node", "src/worker.js"]
