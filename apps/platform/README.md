# nextjs-starter-kit

基于 Next.js App Router 的业务项目模板，内置 React 19、TypeScript、Sass Module、Ant Design、alova 请求封装、Prisma/PostgreSQL、OpenAPI 文档生成，以及 Docker 与 Cloudflare Workers 的 GitHub Actions 部署流程。

## 功能概览

- Next.js App Router 页面与 API Routes。
- 文章管理示例：文章列表、搜索、创建、编辑、删除和无限加载。
- 统一 API 响应封装、错误处理和 alova 客户端请求方法。
- Prisma 7 + PostgreSQL 数据访问，当前包含 `Article` 模型。
- 基于 JSDoc OpenAPI 注释生成 `public/openapi.json`，并通过 Scalar 渲染 API 文档页。
- Ant Design 6 组件与全局 message 提示注入。
- Vite+ 统一管理安装、开发、构建、检查、格式化和 CI 校验。
- Docker 多阶段构建，包含应用镜像和 Prisma 同步镜像。
- GitHub Actions 自动校验、构建 GHCR 镜像，并通过 SSH + Docker Compose 部署。
- 独立 GitHub Actions 使用 `cloudflare/wrangler-action` 构建并部署 Cloudflare Workers。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Sass Module
- Ant Design 6
- alova
- Prisma 7
- PostgreSQL
- Vite+ / pnpm
- Docker / Docker Compose

## 目录结构

```text
src/
  app/            App Router 页面、布局、API Routes 和错误页
  components/     通用组件与 Ant Design Provider
  constants/      应用常量与错误码
  lib/            Prisma、Swagger、服务端响应工具等公共模块
  services/       前端业务请求封装
  styles/         全局样式、变量与 mixin
  utils/          alova 实例与通用工具函数
prisma/           Prisma schema 与迁移目录
scripts/          OpenAPI 生成和部署脚本
public/           静态资源与生成后的 OpenAPI JSON
```

## 环境要求

- Node.js `22.x`
- Vite+ CLI `vp`
- pnpm，由 Vite+ 按项目配置使用
- PostgreSQL，本地开发可使用本机数据(远程服务器数据库/prisma数据库)库或 Docker Compose

安装依赖：

```bash
vp install
```

## 环境变量

本地开发至少需要配置 `DATABASE_URL`：

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/nextjs_starter_kit?schema=public"
```

登录注册功能还需要验证码签名密钥：

```bash
AUTH_CODE_SECRET="change-me"
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="no-reply@example.com"
```

Redis 由项目 Docker Compose 部署，应用容器默认通过`redis://redis:6379/0` 访问 Compose 网络中的 Redis 服务，无需额外配置`REDIS_URL`。`AUTH_CODE_SECRET` 用于验证码 HMAC hash，生产环境必须配置为随机密钥。
邮箱验证码通过 Resend 发送到用户邮箱，接口不会返回验证码明文。

生产环境 API 文档默认隐藏。如需开放 `/api/doc`，配置：

```bash
ENABLE_API_DOCS="true"
```

Docker / SSH 部署流程使用以下变量或 GitHub Secrets：

- `APP_IMAGE`
- `MIGRATE_IMAGE`
- `APP_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_CODE_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
- `GHCR_READ_TOKEN`

Cloudflare Workers 部署使用 GitHub Environments：`development` 与 `production`。两个环境均须配置以下 Secrets：

- `CLOUDFLARE_API_TOKEN`（具备对应 Account 的 Workers 编辑权限）
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `AUTH_CODE_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT_URL`
- `R2_BUCKET_NAME`
- `TINYPNG_API_KEY`

不要提交真实 `.env*`、密钥、Token、私钥或生产连接串。

## 本地开发

同步数据库结构并写入基础角色/权限数据：

```bash
vp run prisma:setup
```

启动开发服务：

```bash
vp run dev
```

打开 [http://localhost:8060](http://localhost:8060)。

常用页面：

- `/`：首页入口
- `/sign-in`：登录页面
- `/sign-up`：注册页面
- `/demo`：请求示例页面
- `/articles`：文章管理
- `/articles/new`：新增文章
- `/articles/[id]/edit`：编辑文章
- `/api/doc`：API 文档

## 常用命令

```bash
vp run dev              # 启动开发服务，端口 8060
vp run build            # 生成 OpenAPI 文档并构建 Next.js
vp run start            # 启动生产服务，端口 8062
vp run cf:build         # 构建 Cloudflare Worker 产物
vp run cf:preview       # 以 Workers runtime 本地预览
vp run cf:deploy:development # 手动部署 development Worker
vp run cf:deploy:production  # 手动部署 production Worker
vp check                # 代码检查
vp run lint             # lint 与 stylelint
vp run lint:fix         # 格式化并自动修复
vp run openapi:generate # 生成 public/openapi.json
vp run prisma:generate  # 生成 Prisma Client
vp run prisma:push      # 根据 schema 推送数据库结构
vp run prisma:seed      # 写入基础角色/权限数据
vp run prisma:setup     # 推送数据库结构并执行 seed
vp run prisma:bootstrap-admin # 为 BOOTSTRAP_ADMIN_EMAIL 指定用户授予管理员角色
vp run prisma:migrate   # 创建并执行本地迁移
vp run prisma:studio    # 打开 Prisma Studio
vp run verify           # CI 校验
```

## API 与数据模型

当前示例 API：

- `GET /api/demo`
- `GET /api/articles`
- `POST /api/articles`
- `GET /api/articles/{id}`
- `PUT /api/articles/{id}`
- `DELETE /api/articles/{id}`

文章数据模型位于 `prisma/schema.prisma`，主要字段包括：

- `title`
- `slug`
- `summary`
- `content`
- `published`
- `createdAt`
- `updatedAt`

请求层封装位于 `src/utils/alova.ts`，业务请求示例位于 `src/services/articles.ts` 和 `src/services/demo.ts`。

## OpenAPI 文档

构建时会先执行：

```bash
vp run openapi:generate
```

该命令从 API Route 中的 `@openapi` 注释生成 `public/openapi.json`。开发环境可访问 `/api/doc` 查看 Scalar API 文档；生产环境需要显式配置 `ENABLE_API_DOCS=true`。

## Docker

构建生产运行镜像：

```bash
docker build --target runner -t nextjs-starter-kit:local .
```

生产 Compose 文件：

```bash
APP_IMAGE=nextjs-starter-kit:local \
MIGRATE_IMAGE=nextjs-starter-kit:local-migrate \
docker compose -f docker-compose.prod.yml up -d
```

`Dockerfile` 还提供 `migrator` 阶段，用于在部署前执行 Prisma 数据库同步。

## 部署流程

`.github/workflows/deploy.yml` 保持原有 Docker / GHCR / SSH 发布流程，会在以下场景触发：

- 推送到 `dev` 分支，部署 development 环境。
- 合并到 `main` 的 Pull Request，部署 production 环境。
- 手动执行 `workflow_dispatch`。

流水线步骤：

1. 使用 Vite+ 安装依赖并执行 `vp run verify`。
2. 构建并推送应用镜像到 GHCR。
3. 构建并推送迁移镜像到 GHCR。
4. 通过 SSH 登录服务器。
5. 同步 Compose 文件和部署脚本。
6. 拉取镜像、执行 Prisma 同步、重启服务。

## Cloudflare Workers 部署

`.github/workflows/deploy-worker.yml` 是独立的 Workers 发布流程，使用 `cloudflare/wrangler-action@v3` 部署 OpenNext 生成的 Worker：

- 推送到 `dev` 分支，执行 `wrangler deploy --env development`，部署 Worker `nextjs-starter-kit-dev`。
- 推送到 `main` 分支，执行 `wrangler deploy --env production`，部署 Worker `nextjs-starter-kit-prod`。
- 手动执行工作流时，可在 `development` 与 `production` 中选择目标环境。

提交前需要先在 GitHub 仓库 Settings → Environments 创建两个同名 Environment，并分别配置上面的 Secrets。生产环境可启用 required reviewers，阻止未经批准的生产部署。

本地预览与手动部署命令：

```bash
vp run cf:preview
vp run cf:deploy:development
vp run cf:deploy:production
```

`wrangler.jsonc` 目前未声明 R2、D1、KV 或 Images 绑定，因此首次部署不依赖预创建的 Cloudflare 资源。

## 开发约定

- 公共请求优先复用 `src/utils/alova.ts` 与 `src/services/`。
- Server Component / Client Component 按需区分，只有存在客户端交互时才添加 `"use client"`。
- `src/utils/` 及路径或文件名包含 `utils` 的文件需要保留 JSDoc `@file`、`@func`、`@desc`、`@param` 和 `@returns` 说明。
- 工具函数使用 `function` 声明，不使用 `const` + 箭头函数。
- 多个异步任务并发时使用 `Promise.allSettled` 并显式处理成功和失败结果。
- 提交信息使用 Conventional Commits，例如 `feat: add article management`。
