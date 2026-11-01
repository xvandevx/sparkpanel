# Образ SparkPanel для установки где угодно: панель и API в одном процессе NestJS,
# фронтенд — статикой с того же порта. Собирается из webSite/ (контекст — обе папки):
#
#   cd webSite && docker build -f headless/Dockerfile -t sparkpanel:dev .
#
# Фронтенд и бэкенд собираются своими этапами — параллельно, и кеш у каждого свой:
# поменяли только бэкенд — фронтенд не пересобирается.

FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=export
RUN npm run build

FROM node:22-alpine AS backend
WORKDIR /backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    FRONTEND_DIR=/app/frontend
COPY --from=backend --chown=node:node /backend/package.json ./
COPY --from=backend --chown=node:node /backend/node_modules ./node_modules
COPY --from=backend --chown=node:node /backend/dist ./dist
COPY --from=frontend --chown=node:node /frontend/out ./frontend
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
