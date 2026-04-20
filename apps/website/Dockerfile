FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NX_DAEMON=false

COPY . .

RUN npm ci
RUN npx nx build website --verbose

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NX_DAEMON=false

COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder /app/apps/website/public ./apps/website/public

CMD ["node", "apps/website/server.js"]
