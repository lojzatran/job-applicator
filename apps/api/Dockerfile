FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NX_DAEMON=false

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json

COPY libs/shared/package.json libs/shared/package.json

RUN npm ci

COPY . .

RUN npx nx build api


FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NX_DAEMON=false

COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY libs/shared/package.json libs/shared/package.json
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/libs/shared/dist libs/shared/dist

CMD ["node", "apps/api/dist/main.js"]
