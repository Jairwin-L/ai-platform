# AGENTS 规范（Codex 可识别）

本文件定义 Codex / Claude Code 在 `ai-platform` 仓库中的默认行为规范（`CLAUDE.md` 是指向本文件的软链接）。
除非用户在当前对话中明确覆盖，否则统一按以下规则执行。

## 1. 项目背景

- 技术栈：前台 `Next.js (App Router) + React 19 + TypeScript + Sass Module + Ant Design`；接口 `NestJS 12 + Prisma 7 + Redis`；管理后台 `Vite + React 19 + react-router + Ant Design`
- 请求层：`alova`；platform 请求封装与业务请求模块位于 `apps/platform/src/api/`（SSR 取数用 `apps/platform/src/api/server.ts`），admin 位于 `apps/admin/src/api/`
- 接口层：全部业务接口在 `apps/db-service`；platform 浏览器端 `/api/*` 经 `next.config.ts` rewrites 转发到 db-service 的 `platform/*`（`/api/upload`、`/api/compress` 转发到根路径），admin 直连 db-service
- 包管理与工具链：Vite+（`vp` / `vpr`）+ `pnpm` workspace（公开仓库）
- 部署：GitHub Actions（全部手动触发）构建 Docker 镜像并推送到 GHCR，再通过 SSH 登录服务器执行各栈的 `scripts/deploy.sh` 拉取镜像并重启服务；db-service 栈（postgres / redis / db-service）与 platform 栈分开部署，经共享 Docker 网络互通，db-service 必须先于 platform 部署。
- Node 版本要求：`22.x`
- 工作区结构：
  - `apps/platform/`：Next.js 前台（`@ai/platform`），只负责页面，不直连数据库；代码目录 `src/`（`api/`、`app/`、`components/`、`hooks/`、`lib/`、`stores/`、`styles/`、`types/`、`typings/` 等）
  - `apps/db-service/`：NestJS 接口服务（`@ai/db-service`），持有 `prisma/`（schema / migrations / seed）；代码目录 `src/`（`common/` 横切能力、`infra/` 基础设施、`modules/` 业务模块、`lib/` AI / BYOK / 第三方凭证、`typings/`）
  - `apps/admin/`：Vite + React 管理后台（`@ai/admin`），代码目录 `src/`（`api/`、`pages/`、`layout/`、`router/`、`stores/`、`hooks/`、`components/`、`constants/`、`utils/`、`styles/`）
  - `packages/constants/`：与应用解耦的常量（`@ai/constants`）
  - `packages/utils/`：与应用解耦的纯工具函数（`@ai/utils`），依赖方向 `platform -> utils -> constants`
  - `packages/types/`：与应用解耦的全局 ambient 类型声明（`@ai/types`），由 platform 的 tsconfig 通过 `include` 引入
  - 依赖 `@/lib`、`@/api`、Prisma Client 或框架/第三方模块类型的代码与类型保留在各自应用的 `src/`（如 `src/typings/`），不要下沉到 `packages/*`
- 工具链配置统一在仓库根目录：`vite.config.ts`（lint / fmt / staged / `verify` 任务）、`vite.lint.config.ts`、`vite.fmt.config.ts`、`stylelint.config.mjs`、`tsconfig.base.json`；各包只保留自己的 `vite.config.ts`（resolve / test）与 `tsconfig.json`
- 应用配置文件：`apps/platform/{package.json,next.config.ts,tsconfig.json}`、`apps/db-service/{package.json,vite.config.ts,tsconfig.json,prisma.config.ts}`、`apps/admin/{package.json,vite.config.ts,tsconfig*.json}`
- 部署相关文件：`apps/platform/Dockerfile`（target `runner`）、`apps/db-service/Dockerfile`（target `service-runner` + `prisma`，构建 context 均为仓库根目录）、`apps/db-service/docker-compose{,.dev,.build}.yml`（postgres / redis / db-service / migrate，拥有共享网络与数据卷）、`apps/platform/docker-compose{,.build}.yml`（只有 app，接入共享网络）、`apps/{platform,db-service}/scripts/deploy.sh`、`.github/workflows/{db-service,platform,admin,deploy-all,deploy-apps}.yml`
- AI 协作资源（teamai 单仓模式 `mode: self`）：`.teamai/` 就是团队仓，`teamai.yaml` 与 `skills/`、`rules/`、`docs/`、`agents/`、`env/`、`hooks/`、`mcp/`、`learnings/` 随业务代码入库；`config.yaml`、`state.json`、`search-index.json`、`reports-wt/` 等是本机状态（含本机绝对路径、用户名、token），由 `.teamai/.gitignore` 排除。根 `.gitignore` 禁止整目录忽略 `.teamai/`。
- `.claude/skills/`、`.codex/skills/`、`**/.agents/`、`**/skills-lock.json` 是生成产物（已 gitignore，skills 唯一来源是 `.teamai/skills/`）；`.claude/settings.json`、`.codex/hooks.json` 是入库的团队 hooks；`.claude/settings.local.json` 是个人配置，不入库。

## 2. 工作优先级

1. 正确性优先：先保证功能与行为正确，再考虑重构。
2. 最小改动优先：仅修改与需求直接相关的文件和代码路径。
3. 可验证优先：改动后说明建议用户手动执行的最小必要检查。
4. 文档先行：无论是开发新功能、解决问题还是修改既有行为，默认先查官方文档、项目文档与当前项目既有实现，再决定方案。
5. 官方文档优先：涉及框架、第三方库或复杂功能开发时，必须以官方文档和当前项目既有实现为依据。
6. 与现有风格一致：遵守当前项目 Vite+ lint/format、Prettier、Stylelint 规范。

## 3. 执行流程

1. 先理解需求与影响范围，再动手改代码。
2. 默认文档先行：无论是开发新功能、解决问题还是修改既有内容，都先查官方文档、项目文档、当前实现与已安装本地文档；确认依据后再实现。
3. 先查现有实现（`apps/platform/src/app/` 路由、`apps/platform/src/api/` 请求封装、`apps/platform/src/components/` 组件、`apps/db-service/src/modules/` 接口、`apps/db-service/src/common/` 与 `infra/`、`apps/admin/src/pages/`、`packages/utils/src/`、`packages/constants/src/`），优先复用已有代码。
4. 涉及功能开发、框架能力或第三方库集成时，必须严格依据官方文档实现；例如 Tiptap 富文本、Next.js App Router、NestJS、Prisma、React、alova、Ant Design 等。若不确定 API、配置项或最佳实践，先查官方文档、官方仓库或项目内已安装文档，再实现。
5. 如果官方文档与项目既有实现存在冲突，应优先说明差异、影响与取舍，再采用当前仓库成本最低且风险最小的方案。
6. 修改完成后默认不主动执行构建、lint、test、`vp check` 等生成构建和代码检测相关命令；仅列出建议用户手动执行的最小必要校验命令。用户明确要求执行时再运行。
7. 本仓库是公开仓库，在提交、发布或用户要求检查时，需要检查是否包含隐私或敏感数据；重点覆盖 `.env*`、部署配置、GitHub Actions、Docker/Compose、源码、文档、`.teamai/`（尤其 `env/`、`mcp/`）、`.claude/`、`.codex/`、Git 跟踪文件与必要的 Git 历史。
8. 隐私与敏感数据检查至少关注：密钥、token、密码、私钥、真实服务器地址、数据库连接串、Webhook、第三方服务凭证、个人邮箱/手机号、内部业务地址与生产环境配置；发现风险时先报告并给出最小修复建议。
9. 检测到用户明确提出“提交代码”指令时，默认不主动执行构建、lint、test、`vp check` 等校验命令；应先提示建议用户手动校验，用户确认提交后再提交代码。若用户明确要求 Codex 执行校验，则在校验通过后提交代码。
10. 提交说明必须参考 [conventional-changelog/commitlint](https://github.com/conventional-changelog/commitlint) 的 Conventional Commits 风格，格式为 `type(scope?): subject`；`scope` 可选，`subject` 必须使用简洁英文说明本次改动。
11. commit 内容必须使用英文，不使用中文提交说明。
12. 常用提交类型包括：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。
13. 输出时必须说明：

- 改了哪些文件
- 为什么这样改
- 建议用户手动执行的校验命令；如用户明确要求 Codex 执行，则说明执行结果
- 未覆盖的风险（如果有）

## 4. 常用命令基线

- 安装依赖：`vp install`
  以下命令均在仓库根目录执行。跨包调用形式为 `vpr <包名>#<脚本>`（`vpr` 是 `vp run` 的独立简写；包名即 `package.json` 的 `name`，如 `@ai/platform`），也可用 `vp -C apps/platform run <脚本>` 切到包目录执行。

- 本地开发：`vpr dev`（platform，8060）、`vpr dev:service`（db-service，8070）、`vpr dev:admin`（admin，8050）、`vpr dev:all`（并行）
- 生产构建：`vpr build`（platform）、`vpr build:service`（db-service，会先生成 Prisma Client）、`vpr build:admin`
- Docker 生产构建：`docker build -f apps/platform/Dockerfile --target runner --build-arg API_INTERNAL_ORIGIN=http://db-service:8072 -t ai-platform:local .`；`docker build -f apps/db-service/Dockerfile --target service-runner -t ai-platform-db-service:local .`（Prisma 工具镜像 `--target prisma`）
- 服务器部署脚本（先 db-service 后 platform）：`SERVICE_IMAGE=<image> apps/db-service/scripts/deploy.sh <production|development>`；`APP_IMAGE=<image> apps/platform/scripts/deploy.sh <production|development>`
- 启动生产服务：`vpr start`（端口 8062）
- 代码检查：`vpr check`（= `vpr --cache -r check`）或 `vpr lint`（额外含 Stylelint）
- 自动修复：`vpr lint:fix`
- 测试：`vpr test`（= `vpr --cache -r test`）
- 全量验证：`vpr verify`（Prisma Client 生成 + 全 workspace check + test + Stylelint，CI 使用）
- Prisma：`vpr prisma:generate`（= `vpr @ai/db-service#prisma:generate`）；其余如 `vpr @ai/db-service#prisma:migrate`、`vpr @ai/db-service#prisma:studio`
- 执行摘要 / 缓存命中：`vpr -v <task>`、`vpr --last-details`
- Vite+ 帮助：`vp help`

当改动涉及以下范围时，默认仅建议用户手动执行对应命令；用户明确要求 Codex 执行时再运行：

- TS 类型、公共工具函数、路由、`next.config.ts`、`tsconfig*.json` 等构建配置 -> 建议 `vpr check`；影响面较大时建议 `vpr build`
- 样式文件（`*.css`、`*.less`、`*.scss`） -> 建议 `vpr lint` 或更小范围的 Stylelint 检查
- `vite.config.ts`、`package.json`、`pnpm-workspace.yaml`、依赖与工具链配置 -> 建议 `vp install` + `vpr check`，必要时建议 `vp env doctor`
- `apps/*/Dockerfile`、`docker-compose*.yml`、`.github/workflows/*.yml` 或 `apps/*/scripts/*.sh` -> 建议检查对应 Docker / GitHub Actions / Compose 流程，必要时建议针对性构建或脚本校验；新增 `packages/*` / `apps/*` 时同步两个 Dockerfile 的 `deps` 阶段 COPY
- 新增或修改测试后 -> 建议 `vpr test`

## 5. 代码修改约束

- 默认不做大规模无关重构。
- 不随意改动构建配置（`next.config.ts`、`tsconfig*.json`、`vite*.config.ts`、`package.json`、`pnpm-workspace.yaml`、`Dockerfile`、`docker-compose*.yml`、`.github/workflows/*.yml`、`stylelint.config.mjs`），除非需求明确要求。
- 不引入与需求无关的新依赖；如确需引入，须说明用途与体积影响。
- 避免重复实现：已有工具函数（`packages/utils/src/`）、常量（`packages/constants/src/`）、请求封装与业务请求模块（`apps/platform/src/api/`、`apps/admin/src/api/`）、db-service 公共能力（`apps/db-service/src/common/`、`infra/`）、组件可复用时不要新增平行实现。
- db-service 接口约定：参数用 zod schema 通过 `@Body({ schema })` / `@Query({ schema })` / `@Param(name, { schema })` 校验；鉴权统一用 `Auth` / `OptionalAuth` / `ByokAuth` / `AiAuth`（前台，平台用户没有角色体系）与 `AdminPermissionAuth` / `AdminAnyPermissionAuth` / `AdminAuth`（管理端系统用户）装饰器，管理端业务接口必须用 `AdminPermissionAuth` / `AdminAnyPermissionAuth` 按 `@ai/constants/permissions` 的权限码鉴权（`AdminAuth` 只用于当前账号、菜单树等不区分权限的会话接口），新增权限码时同步 `apps/db-service/prisma/data/menu/data.ts`；成功响应用 `success` / `paginated`，错误抛 `ApiException`。
- 包边界：`packages/*` 不得引用 `@/` 别名或任何 app 内部模块；应用之间（platform / admin / db-service）不得互相 import，只通过 HTTP 交互；`packages/types` 只放不依赖框架 / 第三方模块类型（如 `next/server`、`react`、`antd`、Prisma Client）的 ambient 声明，这类类型放在 `apps/platform/src/typings/`。新增共享包时同步根与各 app 的 tsconfig `paths`、`next.config.ts` 的 `transpilePackages`、db-service `vite.config.ts` 的 alias 和两个 Dockerfile。
- 新增/修改团队 skill、rule、agent、MCP 定义时，只改 `.teamai/` 下的对应目录（如 `.teamai/skills/<name>/SKILL.md`、`.teamai/mcp/mcp.yaml`），再用 `teamai pull` 注入本地验证；禁止直接写 `.claude/skills/` 或 `.codex/skills/`。
- 接口层响应提示统一在 `apps/platform/src/api/alova.ts`（admin 为 `apps/admin/src/api/http.ts`）全局处理：接口失败返回的错误信息使用 `message.error`，接口成功提示使用 `message.success`；业务组件与 `apps/platform/src/api/` 业务请求模块不要重复调用 `message.error` / `message.success` 处理 alova 接口响应。纯前端校验、上传进度、编辑器图片上传等非 alova 接口交互提示可在组件内按需处理。
- 跟表单相关的新增或修改功能，前端表单输入与接口层请求参数都必须使用 `zod` 作为校验层；优先复用同一份 schema 或从共享 schema 派生，避免前端和接口层校验规则不一致。
- 列表类接口响应不要在 `data` 下再用资源名包裹一层；例如返回凭证列表时使用 `data: [...]`，不要使用 `data: { credentials: [...] }`。分页接口保持既有分页结构（如 `data: { data, total, page, pageSize }`）。
- 单文件代码行数上限：每个页面（`apps/platform/src/app/**/page.tsx`、`layout.tsx` 等）、每个组件文件不得超过 500 行（含注释与空行）；超过时必须按职责拆分为子组件 / 子模块，不允许通过删注释、压行等方式绕过该限制。
- App Router 中区分 Server Component / Client Component，需要 `"use client"` 时务必显式声明，且只在确有客户端交互时使用。
- CSS Module 多词类名必须使用 kebab-case，并通过 bracket notation 访问，例如 `.auth-page` 对应 `styles["auth-page"]`；单词类名保持不变，例如 `.auth` 对应 `styles.auth`。
- `useEffect` 只能写在组件 `return` 的 DOM 节点之前。
- 涉及密钥/凭证只能通过环境变量读取，禁止硬编码或提交到仓库；新增环境变量时同步更新对应应用的 `.env.example`（`apps/db-service/.env.example` / `apps/platform/.env.example` / `apps/admin/.env.example`，只写占位值）、`docker-compose*.yml` 与部署 workflow。admin 的 `VITE_*`、platform 的 `NEXT_PUBLIC_*` 会进入前端产物，禁止放任何密钥。
- 多个异步任务并发执行时，只使用 `Promise.allSettled`，不使用 `Promise.all`；必须显式处理 `fulfilled` 与 `rejected` 两种状态，并根据业务语义决定是否中断后续流程。
- 仅事件处理函数 / 用户操作回调方法名使用 `on` 前缀，例如 `onFinish`、`onClick`、`onSubmit`、`onCancel`、`onUpload`；纯工具函数、格式化函数、数据获取函数、创建函数、计算函数等不要使用 `on` 前缀，应使用 `get`、`format`、`create`、`fetch`、`validate`、`build` 等语义化动词。
- 仅针对 `utils` 目录下所有文件，以及路径或文件名包含 `utils` 的文件：工具函数必须使用 `function` 声明形式，禁止使用 `const` + 箭头函数形式（如 `const foo = () => {}`）。
- 仅针对 `utils` 目录下所有文件，以及路径或文件名包含 `utils` 的文件：注释必须遵循 `https://yuri4ever.github.io/jsdoc/#@file` 的 JSDoc 规范。
- 在上述 `utils` 范围内，每个文件头部必须有 JSDoc `@file` 注释块。
- 在上述 `utils` 范围内，工具函数的 JSDoc 注释必须包含：`@func` 与 `@desc`。
- 在上述 `utils` 范围内，工具函数必须补充 JSDoc 注释，至少包含：`@param`（有入参时）与 `@returns`（有返回值时）；必要时增加 `@throws`、`@example`。
- 对复杂逻辑可加简短注释，注释应解释“为什么”，不是“做了什么”。
- 管理端（`apps/admin/src/**`，Vite + React Router 单页应用）内部路由跳转统一使用 `react-router` 的 `useNavigate()` 返回的 `navigate(...)`，不要使用 `a href`、`Button href`、`window.location` 等会触发整页刷新的方式（整页刷新会重新拉取会话与菜单）；外部链接新窗口打开时带 `noopener,noreferrer`。
- 管理端页面按职责拆分为 `index.tsx`（列表）、`form.tsx`、`columns.tsx`、`form-item-config.tsx`（交给 `components/form-items` 渲染）、`schemas.ts`（zod schema 与 `utils/zod-form-rule` 的 `createZodFormRules` 派生的字段规则）；数据加载失败渲染 `components/exception` 提供重试。
- 管理端（`apps/admin`）界面规范以 [Ant Design design.md](https://ant.design/design.md)（Ant Design v6 默认亮色主题）为准，新增或修改 admin 界面前先读该文档：
  - antd 组件外观通过 `apps/admin/src/app.tsx` 中 `ConfigProvider` 的 `theme`（`token` / `components`）调整，不写全局 `.ant-*` 覆盖；自定义样式只用 `apps/admin/src/styles/variable.scss` 中的 token 变量与 `mixin.scss`，不手写色值、字号和不在网格上的尺寸；改主题时 `theme` 与 scss 变量同步修改。
  - 间距落在 4px 网格（4 / 8 / 16 / 24 / 32）；圆角控件 6px、卡片 / 弹窗等容器 8px、标签 / 提示 4px，正圆只用于头像、徽标和状态点；基准字号 14px，字重只用 400 / 600。
  - 表面分三层：页面底 `$color-bg-layout`、卡片与表格等容器 `$color-bg-container`、弹窗 / 下拉等浮层靠阴影区分；扁平优先，卡片不加阴影，阴影只给真正浮起的表面。
  - 每屏只保留一个 `type="primary"` 按钮，其余降为默认按钮。
  - 状态（启用 / 停用、用户状态等）用 `Badge` 状态点、`Switch` 或 `Alert` 表达，`Tag` 只用于分类标签；预设色（blue、green、purple 等）只用于标签等分类场景，不自定义强调色。
  - 侧栏保持深色，菜单选中项通过 `Menu` 组件 token 统一为浅蓝底加主色字，不要改回主色实底。
  - 动效只用 0.1s / 0.2s / 0.3s 三档时长和 antd 内置缓动，不自定义 `cubic-bezier`。

## 6. 输出与沟通规范

- 与用户沟通默认使用中文（除非用户要求英文）。
- 回答简洁、可执行，避免空泛描述。
- 发生阻塞时，明确说明阻塞点、已尝试方案、下一步建议。
- 如存在多种可行方案，优先给出当前仓库成本最低、风险最小的方案。

## 7. 禁止项

- 未经用户明确要求，不执行破坏性命令（如批量删除、`git reset --hard`、`git push --force`）。
- 未经用户确认，不执行任何会影响线上环境的部署或发布命令。
- 不覆盖用户未要求修改的既有行为。
- 不伪造命令执行结果；无法执行时必须明确说明原因。
- 不提交真实 `.env*`、密钥、token、私钥、账号密码、个人隐私数据、生成产物（`.next/`、`node_modules/`）等到仓库；如需示例环境变量，只提交无敏感值的 `.env.example`。

## 8. 交付标准（Definition of Done）

满足以下条件才算完成：

1. 需求对应功能已实现且逻辑自洽。
2. 相关文件改动最小且与需求直接相关。
3. 已说明与改动范围匹配、建议用户手动执行的必要检查命令；仅在用户明确要求时由 Codex 执行并报告结果。
4. 若改动涉及路由、配置、共享组件或工具函数，已说明建议用户手动执行的构建、类型或 lint 检查；用户明确要求时再执行。
5. 输出包含变更摘要与潜在风险说明（若无风险也应明确“未发现明显风险”）。

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
