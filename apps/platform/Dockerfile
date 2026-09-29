# syntax=docker/dockerfile:1
#
# platform（Next.js standalone）镜像。
# 构建 context 必须是仓库根目录：pnpm workspace 需要根 lockfile 与全部包的 package.json。
#   docker build -f apps/platform/Dockerfile --target runner --build-arg API_INTERNAL_ORIGIN=http://db-service:8072 .
#
# 数据库与 Prisma 工具镜像在 apps/db-service/Dockerfile（service-runner / prisma target）。

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV VP_HOME="/root/.vite-plus"
ENV PATH="${VP_HOME}/bin:${PATH}"

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends bash ca-certificates curl openssl && \
  rm -rf /var/lib/apt/lists/*

# 安装脚本只落 `vp`；`vpr` 是同一个二进制按 argv0 分发的 shim，跨包脚本需要它存在。
# 版本与 pnpm-workspace.yaml catalog 里的 vite-plus 保持一致，避免 latest 发版后镜像构建行为突变；
# 升级时与 apps/db-service/Dockerfile 一起改。
RUN curl -fsSL https://vite.plus | VP_VERSION=0.2.4 bash && \
  ln -sf "$(command -v vp)" "${VP_HOME}/bin/vpr"

FROM base AS deps

# pnpm workspace：安装前需要每个 workspace 包的 package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/platform/package.json ./apps/platform/
COPY apps/db-service/package.json ./apps/db-service/
COPY apps/admin/package.json ./apps/admin/
COPY packages/constants/package.json ./packages/constants/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN vp install --frozen-lockfile --ignore-scripts

FROM deps AS builder

# rewrites 的转发目标在构建期写进 routes-manifest，db-service 内网地址必须是 build-arg；
# dev / prod 的 db-service 端口不同（8070 / 8072），所以两个环境各自构建镜像
ARG API_INTERNAL_ORIGIN
ENV API_INTERNAL_ORIGIN=${API_INTERNAL_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY . .

WORKDIR /app/apps/platform

# 缺转发目标时 rewrites 为空、SSR 取不到数据，宁可构建失败也不要发出一个坏镜像
RUN test -n "${API_INTERNAL_ORIGIN}" || \
  (echo "API_INTERNAL_ORIGIN build-arg is required." >&2 && exit 1)
# 接口层已迁到 db-service，platform 构建期不需要 DATABASE_URL / Prisma Client
RUN vp run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV HOSTNAME=0.0.0.0
# 实际端口由 compose 注入 PORT（dev 8060 / prod 8062）
ENV PORT=8060

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates openssl && \
  rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

# outputFileTracingRoot 指向 workspace 根，standalone 产物内部保留 apps/platform 层级
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/public ./apps/platform/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/static ./apps/platform/.next/static

USER nextjs

EXPOSE 8060

CMD ["node", "apps/platform/server.js"]
