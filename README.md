# ai-platform

## repo

[https://github.com/Jairwin-L/ai-platform](https://github.com/Jairwin-L/ai-platform)

基于 Next.js App Router 的 AI 平台，内置 React 19、TypeScript、Sass Module、Ant Design、alova 请求封装、Prisma/PostgreSQL、Redis、BYOK（自带 API Key）AI Chat、OpenAPI 文档生成，以及 Docker + GitHub Actions 部署流程。

## monorepo

本仓库由 [Vite+](https://vite.plus)（`vp`）统一管理工作区：`vpr`（`vp run` 的独立简写）负责任务编排、依赖顺序与缓存，包管理由 `vp install` 驱动（底层是 pnpm workspace）。

```
apps/
  platform/            Next.js 应用（@ai/platform）
packages/
  constants/           @ai/constants —— 与应用解耦的常量
  utils/               @ai/utils —— 与应用解耦的纯工具函数
  types/               @ai/types —— 与应用解耦的全局 ambient 类型声明
```

依赖方向为 `platform -> utils -> constants`，`types` 独立无依赖。依赖 `@/lib`、`@/api`、Prisma Client 或框架类型的代码与类型保留在 `apps/platform/src/`。

lint / fmt / staged / `verify` 任务统一配置在根目录 `vite.config.ts`（规则拆在 `vite.lint.config.ts`、`vite.fmt.config.ts`），Stylelint 配置在根目录 `stylelint.config.mjs`，TS 公共选项在 `tsconfig.base.json`。

常用命令（在仓库根目录执行）：

```bash
vp install            # 安装依赖（同时安装 git hooks）
vpr dev               # platform 开发服务，端口 8060
vpr build             # platform 生产构建（先生成 OpenAPI 文档）
vpr start             # platform 生产服务，端口 8062
vpr test              # 全 workspace 单测（带缓存）
vpr check             # 全 workspace 类型 + lint + 格式（带缓存）
vpr lint              # check + Stylelint
vpr lint:fix          # 自动修复
vpr verify            # 全量验证（Prisma Client + check + test + Stylelint），CI 使用
```

单独操作某个项目（`vpr <包名>#<脚本>`，或用 `-C` 切到包目录）：

```bash
vpr @ai/platform#prisma:studio
vpr @ai/utils#test
vp -C apps/platform run prisma:push
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

- 真实环境变量只放在未入库的 `apps/platform/.env`（本地）或 GitHub Environments 的 secrets / vars（部署）。根 `.gitignore` 忽略所有 `.env` / `.env.*`，只放行无敏感值的 `.env.example`。
- 新增环境变量时同步更新 [`apps/platform/.env.example`](apps/platform/.env.example)（只写占位值）与部署 workflow。
- 不提交密钥、token、私钥、数据库连接串、服务器 IP / SSH 信息、个人邮箱 / 手机号；`.teamai/env/`、`.teamai/mcp/` 同样只放无敏感值的配置。
- Compose 与部署脚本里的 PostgreSQL 默认口令只用于 Compose 内网（postgres 不暴露宿主端口），**生产环境必须通过 `POSTGRES_PASSWORD` / `DATABASE_URL` secret 覆盖**。
- 所有 PR 默认请求 `@Jairwin-L` 审核（`.github/CODEOWNERS`）；建议为 `main` / `dev` 开启 branch protection，并为 `production` environment 配置 Required reviewers。

## 功能概览

- Next.js App Router 页面与 API Routes。
- 文章管理示例：文章列表、搜索、创建、编辑、删除和无限加载。
- 统一 API 响应封装、错误处理和 alova 客户端请求方法。
- Prisma 7 + PostgreSQL 数据访问，Redis 会话与 BYOK 凭据存储。
- 基于 RBAC 的角色 / 权限管理与后台管理页。
- BYOK AI Chat：用户自带多 Provider API Key，服务端加密存储（见 [`apps/platform/docs/byok-security.md`](apps/platform/docs/byok-security.md)）。
- 基于 JSDoc OpenAPI 注释生成 `public/openapi.json`，并通过 Scalar 渲染 API 文档页。
- Docker 多阶段构建，包含应用镜像和 Prisma 同步镜像。
- GitHub Actions 自动校验、构建 GHCR 镜像，并通过 SSH + Docker Compose 部署。

## 技术栈

Next.js 16 · React 19 · TypeScript · Sass Module · Ant Design 6 · alova · Prisma 7 · PostgreSQL · Redis · Vite+ / pnpm · Docker / Docker Compose

## 环境要求

- Node.js `22.18.0` 或更高的 `22.x` 版本
- Vite+ CLI `vp`
- pnpm，由 Vite+ 按项目配置使用
- PostgreSQL 与 Redis，本地开发可使用本机服务或 Docker

## 环境变量

复制示例文件后填入真实值（`apps/platform/.env` 不入库）：

```bash
cp apps/platform/.env.example apps/platform/.env
```

本地开发至少需要 `DATABASE_URL`、`REDIS_URL`、`AUTH_CODE_SECRET`；邮件验证码还需要 `RESEND_API_KEY`、`RESEND_FROM_EMAIL`；BYOK 需要 `AI_KEY_ENCRYPTION_KEY_V1`、`AI_KEY_REDIS_ID_SECRET`（`openssl rand -base64 32` 生成）。完整列表与说明见 `.env.example`。

Docker Compose 部署时，应用容器默认通过 `redis://redis:6379/0` 访问 Compose 网络中的 Redis 服务。`AUTH_CODE_SECRET` 用于验证码 HMAC hash，生产环境必须配置为随机密钥。邮箱验证码通过 Resend 发送，接口不会返回验证码明文。

生产环境 API 文档默认隐藏，如需开放 `/api/doc`，配置 `ENABLE_API_DOCS=true`。

## 本地开发

同步数据库结构并写入基础角色 / 权限数据：

```bash
vpr @ai/platform#prisma:setup
```

启动开发服务：

```bash
vpr dev
```

打开 [http://localhost:8060](http://localhost:8060)。常用页面：

- `/`：首页入口
- `/sign-in`、`/sign-up`：登录 / 注册
- `/articles`：文章管理
- `/ai/chat`：AI Chat
- `/admin`：后台管理
- `/api/doc`：API 文档

platform 的其他脚本（均可用 `vpr @ai/platform#<脚本>` 执行）：

```bash
openapi:generate          # 生成 public/openapi.json
prisma:generate           # 生成 Prisma Client
prisma:migrate            # 创建并执行本地迁移
prisma:push               # 根据 schema 推送数据库结构，仅适合空库或临时开发
prisma:seed               # 写入基础角色 / 权限数据
prisma:bootstrap-admin    # 为 BOOTSTRAP_ADMIN_EMAIL 指定用户授予管理员角色
prisma:studio             # 打开 Prisma Studio
prisma:deploy             # 部署环境执行已提交的 Prisma migrations
prisma:sync:deploy        # 部署环境按数据库状态同步结构
cf:build / cf:preview     # 构建 / 本地预览 Cloudflare Worker
```

## Docker

Dockerfile 的构建 context 是仓库根目录（pnpm workspace 需要根 lockfile 和所有包的 `package.json`），命令都在仓库根目录执行：

```bash
docker build -f apps/platform/Dockerfile --target runner -t ai-platform:local .
docker build -f apps/platform/Dockerfile --target migrator -t ai-platform:local-migrate .
```

生产 Compose：

```bash
APP_IMAGE=ai-platform:local \
MIGRATE_IMAGE=ai-platform:local-migrate \
docker compose -f apps/platform/docker-compose.prod.yml up -d
```

新增 `packages/*` 时，需要同步 Dockerfile `deps` 阶段的 `COPY packages/<name>/package.json`。

## 部署流程

`.github/workflows/deploy.yml` 使用 Docker / GHCR / SSH 发布，会在以下场景触发：

- 推送到 `dev` 分支，部署 development 环境。
- 合并到 `main` 的 Pull Request，部署 production 环境。
- 手动执行 `workflow_dispatch`。

流水线步骤：

1. 使用 Vite+ 安装依赖并在仓库根目录执行 `vp run verify`。
2. 构建并推送应用镜像与迁移镜像到 GHCR。
3. 通过 SSH 登录服务器，同步 Compose 文件和部署脚本，按 GitHub Environment 的 secrets / vars 生成服务器 env 文件。
4. 拉取镜像、执行 Prisma 同步、重启服务。

workflow 使用 GitHub Environments 区分环境（`main` → `production`，`dev` → `development`），需要在 `Settings -> Environments` 中分别配置：

- Secrets：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_PATH`、`DEPLOY_SSH_KEY`、`GHCR_READ_TOKEN`、`POSTGRES_PASSWORD`、`DATABASE_URL`、`AUTH_CODE_SECRET`、`AI_KEY_ENCRYPTION_KEY_V1`、`AI_KEY_REDIS_ID_SECRET`、`RESEND_API_KEY`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`
- Variables（或 Secrets）：`BOOTSTRAP_ADMIN_EMAIL`、`RESEND_FROM_EMAIL`、`RESEND_FROM_NAME`、`R2_ENDPOINT_URL`、`R2_BUCKET_NAME`，以及可选的 `APP_PORT`、`POSTGRES_DB`、`POSTGRES_USER`、`DEPLOY_ENV_FILE`、`COMPOSE_PROJECT_NAME`

服务器地址、SSH 私钥等只存在于 GitHub Environments，仓库中不出现任何真实值。

## Cloudflare Workers 部署（未启用）

`.github/deploy-worker.yml` 是独立的 Workers 发布流程，放在 `.github/workflows/` 之外，GitHub Actions 不会加载。启用时移回 `.github/workflows/`，并在 `development` / `production` 两个 Environment 中配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 以及上面的应用 secrets。

本地预览与手动部署：

```bash
vpr @ai/platform#cf:preview
vpr @ai/platform#cf:deploy:development
vpr @ai/platform#cf:deploy:production
```

## 开发约定

详见 [`AGENTS.md`](AGENTS.md)（`CLAUDE.md` 为其软链接）。要点：

- 公共请求优先复用 `apps/platform/src/api/alova.ts` 与 `apps/platform/src/api/` 业务请求模块。
- Server Component / Client Component 按需区分，只有存在客户端交互时才添加 `"use client"`。
- `utils` 相关文件需要保留 JSDoc `@file`、`@func`、`@desc`、`@param` 和 `@returns` 说明，工具函数使用 `function` 声明。
- 多个异步任务并发时使用 `Promise.allSettled` 并显式处理成功和失败结果。
- 提交信息使用 Conventional Commits（英文），例如 `feat: add article management`。
