FROM node:20

WORKDIR /usr/src/app

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
