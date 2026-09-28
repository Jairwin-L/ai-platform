# ai-platform

## repo

[https://github.com/Jairwin-L/ai-platform](https://github.com/Jairwin-L/ai-platform)

AI 平台 monorepo：Next.js App Router 前台（platform）+ NestJS 接口服务（db-service）+ Vite React 管理后台（admin）。内置 React 19、TypeScript、Sass Module、Ant Design、alova 请求封装、Prisma/PostgreSQL、Redis、BYOK（自带 API Key）AI Chat、OpenAPI（Scalar）文档，以及 Docker + GitHub Actions 部署流程。

## monorepo

本仓库由 [Vite+](https://vite.plus)（`vp`）统一管理工作区：`vpr`（`vp run` 的独立简写）负责任务编排、依赖顺序与缓存，包管理由 `vp install` 驱动（底层是 pnpm workspace）。

```
apps/
  platform/            Next.js 前台（@ai/platform），只负责页面；浏览器 /api/* 经 rewrites 转发到 db-service
  db-service/          NestJS 接口服务（@ai/db-service），持有 Prisma schema / 迁移 / seed、Redis、全部业务接口
  admin/               Vite + React 管理后台（@ai/admin），静态部署，直连 db-service
packages/
  constants/           @ai/constants —— 与应用解耦的常量
  utils/               @ai/utils —— 与应用解耦的纯工具函数
  types/               @ai/types —— 与应用解耦的全局 ambient 类型声明
```

依赖方向为 `platform / admin / db-service -> utils -> constants`，`types` 独立无依赖。数据库只由 db-service 访问，platform 与 admin 都通过 HTTP 调用。

| 应用       | 开发端口             | 生产端口       |
| ---------- | -------------------- | -------------- |
| platform   | 8060                 | 8062           |
| admin      | 8050（preview 8051） | 静态文件       |
| db-service | 8070                 | 8072（容器内） |

lint / fmt / staged / `verify` 任务统一配置在根目录 `vite.config.ts`（规则拆在 `vite.lint.config.ts`、`vite.fmt.config.ts`），Stylelint 配置在根目录 `stylelint.config.mjs`，TS 公共选项在 `tsconfig.base.json`。

常用命令（在仓库根目录执行）：

```bash
vp install            # 安装依赖（同时安装 git hooks）
vpr dev               # platform 开发服务，端口 8060
vpr dev:service       # db-service 开发服务，端口 8070
vpr dev:admin         # admin 开发服务，端口 8050
vpr dev:all           # 三个应用并行启动
vpr build             # platform 生产构建
vpr build:service     # db-service 打包（先生成 Prisma Client）
vpr build:admin       # admin 静态构建
vpr test              # 全 workspace 单测（带缓存）
vpr check             # 全 workspace 类型 + lint + 格式（带缓存）
vpr lint              # check + Stylelint
vpr lint:fix          # 自动修复
vpr prisma:generate   # 生成 db-service 的 Prisma Client
vpr verify            # 全量验证（Prisma Client + check + test + Stylelint），CI 使用
```

单独操作某个项目（`vpr <包名>#<脚本>`，或用 `-C` 切到包目录）：

```bash
vpr @ai/db-service#prisma:studio
vpr @ai/utils#test
vp -C apps/db-service run prisma:push
```

`vpr` 的常用选择器：`-r` 全 workspace、`-F <包名|目录|glob>` 过滤、`-t` 带上依赖、`--parallel` 并行、`--cache` / `--no-cache` 控制缓存、`-v` 查看执行摘要。

## teamai

本仓库用 [teamai-cli](https://github.com/Tencent/teamai-cli) 统一管理 AI 协作资源（skills / rules / docs / hooks / MCP），采用**单仓模式（`mode: self`）**：本仓库自己就是团队仓，知识随业务代码提交到 `main`，会话报告走 `teamai-reports` 孤儿分支。

```
.teamai/
  teamai.yaml        团队配置（入库）
  skills/            团队 skills —— 唯一来源（入库）
  rules/             共享规则（入库）
  docs/              团队文档（入库）
  agents/            subagent 定义（入库）
  learnings/         沉淀的会话知识（入库）
  env/               共享环境变量（入库，不放真实密钥）
  hooks/             团队 hooks（入库）
  mcp/mcp.yaml       共享 MCP server（入库，不放 token）
  config.yaml        本机配置（含绝对路径与用户名，不入库）
  state.json         同步状态（不入库）
  reports-wt/        teamai-reports 分支的 git worktree（不入库）
```

`.teamai/.gitignore` 声明上面哪些是机器本地状态；根 `.gitignore` 不要整目录忽略 `.teamai/`，否则 git 不会下降进去，那份声明会彻底失效。

各 AI 工具目录下的 `skills/` 是 `teamai pull` 生成的**实体副本**，已在根 `.gitignore` 忽略：

```
.claude/skills/      ← 由 .teamai/skills/ 注入，勿手工编辑，勿入库
.codex/skills/       ← 同上
.claude/settings.json、.codex/hooks.json   团队 hooks，入库
.claude/settings.local.json                个人权限配置，不入库
```

新人 clone 后首次开 AI 会话时，SessionStart hook 会自动跑 `teamai pull` 把 skills 注入到工具目录；没装 teamai 的 hook 会静默跳过。手动初始化：

```bash
vp install -g teamai-cli
teamai init . --self --scope project --agent claude,codex
```

常用命令：

```bash
teamai doctor            # 诊断配置（认准输出里的 Scope 是 project）
teamai status            # 本地与团队仓的差异、同步状态
teamai skill             # 列出 REPO SKILLS 与各工具目录已注入的 skills
teamai pull              # 拉团队资源并注入本地 AI 工具（会话启动时自动执行）
teamai push              # 把本地新增资源提 PR 到本仓库
```

新增一个团队 skill：直接放进 `.teamai/skills/<name>/`（带 `SKILL.md`），然后 `teamai pull` 注入本地验证，最后随业务代码一起提交。**不要**直接往 `.claude/skills/` 里放 —— 那是产物目录，会被忽略且下次 pull 可能被覆盖。

## 安全与敏感数据

本仓库是**公开仓库**，提交前请确认：

- 真实环境变量只放在未入库的 `apps/*/.env`（本地）或 GitHub Environments 的 secrets / vars（部署）。根 `.gitignore` 忽略所有 `.env` / `.env.*`，只放行无敏感值的 `.env.example`。
- 新增环境变量时同步更新对应应用的 `.env.example`（只写占位值）与部署 workflow：接口侧见 [`apps/db-service/.env.example`](apps/db-service/.env.example)，前台见 [`apps/platform/.env.example`](apps/platform/.env.example)，后台见 [`apps/admin/.env.example`](apps/admin/.env.example)。
- admin 的 `VITE_*`、platform 的 `NEXT_PUBLIC_*` 会被编译进前端产物，只能放公开信息。
- 不提交密钥、token、私钥、数据库连接串、服务器 IP / SSH 信息、个人邮箱 / 手机号；`.teamai/env/`、`.teamai/mcp/` 同样只放无敏感值的配置。
- Compose 与部署脚本里的 PostgreSQL 默认口令只用于 Compose 内网（postgres 不暴露宿主端口），**生产环境必须通过 `POSTGRES_PASSWORD` / `DATABASE_URL` secret 覆盖**。
- db-service 端口默认只绑定 `127.0.0.1`，由宿主机反向代理（HTTPS）对外提供给管理后台；生产环境 `/doc` 默认隐藏。
- 所有 PR 默认请求 `@Jairwin-L` 审核（`.github/CODEOWNERS`）；建议为 `main` / `dev` 开启 branch protection，并为 `production` environment 配置 Required reviewers。

## 功能概览

- platform：Next.js App Router 前台页面（首页、登录注册、文章、AI Chat、个人中心），SSR 通过 `API_INTERNAL_ORIGIN` 直连 db-service。
- db-service：NestJS 12 接口服务，统一响应封装与错误码、zod（Standard Schema）参数校验、Redis 会话（前台 / 后台会话域隔离）、限流、RBAC、BYOK 请求安全校验、R2 直传签名、图片压缩。
- admin：用户 / 角色 / 权限 / 系统设置 / AI Provider / 第三方服务管理；仅 `SUPER_ADMIN` / `ADMIN` 可登录，登录密码 RSA-OAEP 加密传输。
- BYOK AI Chat：用户自带多 Provider API Key，服务端加密存储（见 [`apps/db-service/docs/byok-security.md`](apps/db-service/docs/byok-security.md)）。
- Docker 多阶段构建：platform 镜像、db-service 镜像与 Prisma 迁移镜像；GitHub Actions 自动校验、构建 GHCR 镜像，并通过 SSH + Docker Compose 部署。

## 技术栈

Next.js 16 · NestJS 12 · React 19 · TypeScript · Sass Module · Ant Design 6 · alova · Prisma 7 · PostgreSQL · Redis · Vite+ / pnpm · Docker / Docker Compose

## 环境要求

- Node.js `22.18.0` 或更高的 `22.x` 版本
- Vite+ CLI `vp`
- pnpm，由 Vite+ 按项目配置使用
- PostgreSQL 与 Redis，本地开发可使用本机服务或 Docker

## 环境变量

复制示例文件后填入真实值（`.env` / `.env.local` 均不入库）：

```bash
cp apps/db-service/.env.example apps/db-service/.env
cp apps/platform/.env.example apps/platform/.env
cp apps/admin/.env.example apps/admin/.env.local
```

db-service 本地开发至少需要 `DATABASE_URL`、`REDIS_URL`、`AUTH_CODE_SECRET`；邮件验证码还需要 `RESEND_API_KEY`、`RESEND_FROM_EMAIL`；BYOK 需要 `AI_KEY_ENCRYPTION_KEY_V1`、`AI_KEY_REDIS_ID_SECRET`（`openssl rand -base64 32` 生成）。完整列表与说明见各应用的 `.env.example`。

platform 只需要 `API_INTERNAL_ORIGIN`（db-service 地址，本地 `http://localhost:8070`）；它同时是 rewrites 的转发目标，在构建期写入。

## 本地开发

同步数据库结构并写入基础角色 / 权限数据：

```bash
vpr @ai/db-service#prisma:setup
```

启动开发服务：

```bash
vpr dev:all
```

- platform：[http://localhost:8060](http://localhost:8060)（`/`、`/sign-in`、`/sign-up`、`/articles`、`/ai/chat`）
- admin：[http://localhost:8050](http://localhost:8050)（vite 代理 `/api` → db-service）
- db-service：[http://localhost:8070/doc](http://localhost:8070/doc)（Scalar API 文档，非生产环境默认开启）

首个管理员：在 platform 注册账号后，把邮箱写进 `BOOTSTRAP_ADMIN_EMAIL` 再执行 `vpr @ai/db-service#prisma:bootstrap-admin`。

db-service 的其他脚本（均可用 `vpr @ai/db-service#<脚本>` 执行）：

```bash
openapi:generate          # 生成 openapi.json
prisma:generate           # 生成 Prisma Client
prisma:migrate            # 创建并执行本地迁移
prisma:push               # 根据 schema 推送数据库结构，仅适合空库或临时开发
prisma:seed               # 写入基础角色 / 权限数据
prisma:bootstrap-admin    # 为 BOOTSTRAP_ADMIN_EMAIL 指定用户授予管理员角色
prisma:studio             # 打开 Prisma Studio
prisma:deploy             # 部署环境执行已提交的 Prisma migrations
prisma:sync:deploy        # 部署环境按数据库状态同步结构
```

## Docker

Dockerfile 的构建 context 是仓库根目录（pnpm workspace 需要根 lockfile 和所有包的 `package.json`），命令都在仓库根目录执行：

```bash
docker build -f apps/platform/Dockerfile --target runner --build-arg API_INTERNAL_ORIGIN=http://db-service:8072 -t ai-platform:local .
docker build -f apps/db-service/Dockerfile --target runner -t ai-platform:local-service .
docker build -f apps/db-service/Dockerfile --target migrator -t ai-platform:local-migrate .
```

生产 Compose（同一个项目内包含 postgres / redis / db-service / platform）：

```bash
APP_IMAGE=ai-platform:local \
SERVICE_IMAGE=ai-platform:local-service \
MIGRATE_IMAGE=ai-platform:local-migrate \
docker compose -f apps/platform/docker-compose.prod.yml up -d
```

新增 `packages/*` 或 `apps/*` 时，需要同步 `apps/platform/Dockerfile` 与 `apps/db-service/Dockerfile` 中 `deps` 阶段的 `COPY <dir>/package.json`。

## 部署流程

`.github/workflows/deploy.yml` 使用 Docker / GHCR / SSH 发布，会在以下场景触发：

- 推送到 `dev` 分支，部署 development 环境。
- 合并到 `main` 的 Pull Request，部署 production 环境。
- 手动执行 `workflow_dispatch`。

流水线步骤：

1. 使用 Vite+ 安装依赖并在仓库根目录执行 `vp run verify`。
2. 构建并推送 platform 镜像（`<sha>`）、db-service 镜像（`<sha>-service`）与迁移镜像（`<sha>-migrate`）到 GHCR；并行构建 admin 静态产物。
3. 通过 SSH 登录服务器，同步 Compose 文件和部署脚本，按 GitHub Environment 的 secrets / vars 生成服务器 env 文件。
4. 拉取镜像、执行 Prisma 同步 / seed / bootstrap-admin，依次重启 db-service 与 platform。
5. 配置了 `DEPLOY_ADMIN_PATH` 时，把 admin 静态产物整体替换到服务器目录（由宿主机 Web 服务器托管）。

workflow 使用 GitHub Environments 区分环境（`main` → `production`，`dev` → `development`），需要在 `Settings -> Environments` 中分别配置：

- Secrets：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_PATH`、`DEPLOY_SSH_KEY`、`GHCR_READ_TOKEN`、`POSTGRES_PASSWORD`、`DATABASE_URL`、`AUTH_CODE_SECRET`、`AI_KEY_ENCRYPTION_KEY_V1`、`AI_KEY_REDIS_ID_SECRET`、`RESEND_API_KEY`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`，可选 `AI_SECRET_MASTER_KEY`
- Variables（或 Secrets）：`BOOTSTRAP_ADMIN_EMAIL`、`RESEND_FROM_EMAIL`、`RESEND_FROM_NAME`、`R2_ENDPOINT_URL`、`R2_BUCKET_NAME`，以及可选的 `APP_PORT`、`SERVICE_PORT`、`SERVICE_BIND`、`POSTGRES_DB`、`POSTGRES_USER`、`DEPLOY_ENV_FILE`、`COMPOSE_PROJECT_NAME`、`BYOK_TRUST_PROXY_HEADERS`（默认 `true`）、`ENABLE_API_DOCS`
- 管理后台相关 Variables：`VITE_BASE_API_URL`（必填，db-service 的公网 HTTPS 地址）、`VITE_APP_TITLE`、`VITE_PLATFORM_URL`、`DEPLOY_ADMIN_PATH`（服务器上的静态目录，留空跳过部署）、`CORS_ALLOWED_ORIGINS`（必须包含管理后台域名）、`NEXT_PUBLIC_ADMIN_URL`（前台账户菜单的后台入口，留空不显示）

服务器地址、SSH 私钥等只存在于 GitHub Environments，仓库中不出现任何真实值。

## Cloudflare Workers 部署（未启用）

`.github/deploy-worker.yml` 是独立的 Workers 发布流程，放在 `.github/workflows/` 之外，GitHub Actions 不会加载。接口层迁到 db-service 后，Workers 上的 platform 只剩页面，启用前需要为其配置可访问的 `API_INTERNAL_ORIGIN`，并移除 workflow 里已不再需要的数据库 / 邮件 / R2 secrets。

本地预览与手动部署：

```bash
vpr @ai/platform#cf:preview
vpr @ai/platform#cf:deploy:development
vpr @ai/platform#cf:deploy:production
```

## 开发约定

详见 [`AGENTS.md`](AGENTS.md)（`CLAUDE.md` 为其软链接）。要点：

- platform 请求优先复用 `apps/platform/src/api/alova.ts` 与 `apps/platform/src/api/` 业务请求模块；SSR 取数用 `apps/platform/src/api/server.ts`。
- 新接口写在 `apps/db-service/src/modules/`，参数用 zod schema 通过 `@Body({ schema })` / `@Query({ schema })` 校验，鉴权用 `Auth` / `PermissionAuth` / `AdminAuth` 装饰器。
- Server Component / Client Component 按需区分，只有存在客户端交互时才添加 `"use client"`。
- `utils` 相关文件需要保留 JSDoc `@file`、`@func`、`@desc`、`@param` 和 `@returns` 说明，工具函数使用 `function` 声明。
- 多个异步任务并发时使用 `Promise.allSettled` 并显式处理成功和失败结果。
- 提交信息使用 Conventional Commits（英文），例如 `feat: add article management`。
