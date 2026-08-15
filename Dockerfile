FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Без ARG/ENV: адрес бэка НЕ впечатывается в бандл,
# он подставляется в env.js при старте контейнера (runtime)
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# При старте генерируем env.js из переменной окружения API_URL —
# одна и та же сборка работает на дев/прод, смена бэка = рестарт с другой env
CMD ["/bin/sh", "-c", "printf 'window.__ENV__ = {\"API_URL\": \"%s\"};\\n' \"$API_URL\" > /usr/share/nginx/html/env.js && exec nginx -g 'daemon off;'"]
