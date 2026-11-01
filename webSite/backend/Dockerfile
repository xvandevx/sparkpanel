FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Встроенное хранилище файлов — папка, на проде в неё монтируется том.
# Владелец — nestjs: сервер пишет туда загруженные файлы
RUN mkdir -p /data/uploads && chown nestjs:nodejs /data/uploads
ENV UPLOADS_DIR /data/uploads

USER nestjs

# Внутри контейнера — 3010 (как и в prod/docker-compose.yml).
# Локально dev-сервер поднимается на 3402: main.ts читает PORT из env.
EXPOSE 3010
ENV PORT 3010

# Все исходники лежат в src/, поэтому nest build кладёт вход в dist/main.js
# (а не dist/src/main.js — это зависит от того, есть ли .ts-файлы вне src/).
CMD ["node", "dist/main"]
