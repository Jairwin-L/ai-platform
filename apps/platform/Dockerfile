# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV VP_HOME="/root/.vite-plus"
ENV PATH="${VP_HOME}/bin:${PATH}"

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends bash ca-certificates curl && \
  rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://vite.plus -o /tmp/install-vp.sh && \
  bash /tmp/install-vp.sh && \
  rm /tmp/install-vp.sh

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile --ignore-scripts

FROM deps AS builder

ARG NEXT_PUBLIC_API_URL=https://m1.apifoxmock.com/m1/7116578-6839375-default

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .
RUN vp run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV HOSTNAME=0.0.0.0
ENV PORT=8062

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates && \
  rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8062

CMD ["node", "server.js"]
