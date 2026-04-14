FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NX_DAEMON=false

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/website/package.json apps/website/package.json

COPY libs/shared/package.json libs/shared/package.json

RUN npm ci

COPY . .

RUN npx nx build website --verbose


FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NX_DAEMON=false

COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/website/package.json apps/website/package.json
COPY libs/shared/package.json libs/shared/package.json
COPY --from=builder /app/apps/website/dist apps/website/dist
COPY --from=builder /app/libs/shared/dist libs/shared/dist

CMD ["node", "apps/website/dist/main.js"]
