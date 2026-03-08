FROM node:20

# Install Docker CLI via apt instead of apk on Debian
RUN apt-get update && apt-get install -y docker.io

WORKDIR /usr/src/app

COPY worker/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY worker/ .

CMD ["node", "src/worker.js"]
