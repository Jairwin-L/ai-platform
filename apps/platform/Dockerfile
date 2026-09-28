# syntax=docker/dockerfile:1
#
# platform（Next.js standalone）镜像。
# 构建 context 必须是仓库根目录：pnpm workspace 需要根 lockfile 与全部包的 package.json。
#   docker build -f apps/platform/Dockerfile --target runner .
#
# 数据库迁移镜像已迁到 apps/db-service/Dockerfile 的 migrator target。

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
COPY apps/db-service/package.json ./apps/db-service/
COPY apps/admin/package.json ./apps/admin/
COPY packages/constants/package.json ./packages/constants/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN vp install --frozen-lockfile --ignore-scripts

FROM deps AS builder

# rewrites 的转发目标在构建期写进 routes-manifest，db-service 内网地址必须是 build-arg
ARG API_INTERNAL_ORIGIN=http://db-service:8072
ENV API_INTERNAL_ORIGIN=${API_INTERNAL_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY . .
WORKDIR /app/apps/platform
# 接口层已迁到 db-service，platform 构建期不需要 DATABASE_URL / Prisma Client
RUN vp run build

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
