# Build stage
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve stage using Nginx
FROM nginx:alpine

# Copy custom nginx config if needed, else default is fine for simple SPA
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
