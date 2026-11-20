FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NX_DAEMON=false
RUN npx nx build api --configuration=production && npx nx build admin --configuration=qa

FROM build AS api
ENV NODE_ENV=production
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
CMD ["node", "dist/apps/api/main.js"]

FROM caddy:2-alpine AS web
COPY --from=build /app/dist/apps/admin/browser /srv
COPY deploy/qa/Caddyfile /etc/caddy/Caddyfile
