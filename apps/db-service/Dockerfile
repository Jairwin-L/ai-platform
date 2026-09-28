# syntax=docker/dockerfile:1
#
# db-service（NestJS）运行镜像 + Prisma 迁移工具镜像。
# 构建 context 必须是仓库根目录：pnpm workspace 需要根 lockfile 与全部包的 package.json。
#   docker build -f apps/db-service/Dockerfile --target runner -t ai-db-service:local .
#   docker build -f apps/db-service/Dockerfile --target migrator -t ai-db-service:local-migrate .

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV VP_HOME="/root/.vite-plus"
ENV PATH="${VP_HOME}/bin:${PATH}"

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends bash ca-certificates curl openssl && \
  rm -rf /var/lib/apt/lists/*

# 安装脚本只落 `vp`；`vpr` 是同一个二进制按 argv0 分发的 shim，package.json 的 build 脚本需要它。
# 版本与 pnpm-lock.yaml 里解析出的 vite-plus 保持一致，避免 latest 发版后镜像构建行为突变。
RUN curl -fsSL https://vite.plus | VP_VERSION=0.2.4 bash && \
  ln -sf "$(command -v vp)" "${VP_HOME}/bin/vpr"

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/platform/package.json ./apps/platform/
COPY apps/db-service/package.json ./apps/db-service/
COPY apps/admin/package.json ./apps/admin/
COPY packages/constants/package.json ./packages/constants/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN vp install --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------------
# 迁移工具镜像：migrate deploy / 基线同步 / seed / bootstrap-admin 都在这里跑
# ---------------------------------------------------------------------------

FROM deps AS migrator

ENV NODE_ENV=production

WORKDIR /app/apps/db-service
COPY apps/db-service/prisma ./prisma
COPY apps/db-service/prisma.config.ts ./
RUN DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" vp run prisma:generate

CMD ["vp", "run", "prisma:deploy"]

# ---------------------------------------------------------------------------
# db-service 运行镜像
# ---------------------------------------------------------------------------

FROM deps AS builder

ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY . .

WORKDIR /app/apps/db-service

RUN DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" vp run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV PORT=8072

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates openssl && \
  rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nodeapp

# vp pack 只内联 @ai/*，其余依赖仍从 node_modules 解析；
# pnpm 的 workspace 软链是相对路径，root 与包内 node_modules 必须成对拷贝。
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodeapp:nodejs /app/apps/db-service/node_modules ./apps/db-service/node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/apps/db-service/package.json ./apps/db-service/package.json
COPY --from=builder --chown=nodeapp:nodejs /app/apps/db-service/dist ./apps/db-service/dist
COPY --from=builder --chown=nodeapp:nodejs /app/apps/db-service/generated ./apps/db-service/generated

USER nodeapp

WORKDIR /app/apps/db-service

EXPOSE 8072

CMD ["node", "--enable-source-maps", "dist/main.mjs"]
