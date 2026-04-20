FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NX_DAEMON=false

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json

COPY libs/shared/package.json libs/shared/package.json

RUN npm ci

COPY . .

RUN SKIP_ENV_VALIDATION=true npx nx build @apps/shared
RUN SKIP_ENV_VALIDATION=true npx nx build api


FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NX_DAEMON=false

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY libs/shared/package.json libs/shared/package.json
RUN npm ci --omit=dev
COPY --from=builder --chown=node:node /app/libs/shared/dist libs/shared/dist
COPY --from=builder --chown=node:node /app/apps/api/dist apps/api/dist

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]

