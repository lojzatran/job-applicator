FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NX_DAEMON=false

COPY . .

RUN npm ci
RUN SKIP_ENV_VALIDATION=true npx nx build website

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NX_DAEMON=false

COPY --from=builder --chown=node:node /app/apps/website/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder --chown=node:node /app/apps/website/public ./apps/website/public

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "apps/website/server.js"]
