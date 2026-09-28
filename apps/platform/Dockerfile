# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV VP_HOME="/root/.vite-plus"
ENV PATH="${VP_HOME}/bin:${PATH}"

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends bash ca-certificates curl openssl && \
  rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://vite.plus -o /tmp/install-vp.sh && \
  bash /tmp/install-vp.sh && \
  rm /tmp/install-vp.sh

FROM base AS deps

# Build context is the workspace root: docker build -f apps/platform/Dockerfile .
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/platform/package.json ./apps/platform/
COPY packages/constants/package.json ./packages/constants/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN vp install --frozen-lockfile --ignore-scripts

FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY . .
WORKDIR /app/apps/platform
RUN DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" vp run prisma:generate
RUN vp run build

FROM deps AS migrator

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/platform
COPY apps/platform/prisma ./prisma
COPY apps/platform/prisma.config.ts ./
RUN DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" vp run prisma:generate

CMD ["vp", "run", "prisma:deploy"]

FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV HOSTNAME=0.0.0.0
ENV PORT=8062

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates openssl && \
  rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

# Standalone output mirrors the workspace layout (outputFileTracingRoot = workspace root).
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/public ./apps/platform/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/static ./apps/platform/.next/static

USER nextjs

EXPOSE 8062

CMD ["node", "apps/platform/server.js"]
