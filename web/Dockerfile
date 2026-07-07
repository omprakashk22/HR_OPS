# ---- build stage ----
FROM node:24-alpine AS build
WORKDIR /app
# API base URL is baked at build time. Default proxies through nginx at /api/v1.
ARG VITE_API_URL=/api/v1
COPY package*.json ./
RUN npm ci
COPY . .
RUN echo "VITE_API_URL=$VITE_API_URL" > .env.production && npm run build

# ---- runtime stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
