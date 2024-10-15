FROM docker.io/library/node:22-alpine as build

WORKDIR /app
COPY . /app

RUN npm install
RUN npm run build

FROM docker.io/library/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /var/www/html/
