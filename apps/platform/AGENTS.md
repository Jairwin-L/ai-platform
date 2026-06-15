# AGENTS 规范（Codex 可识别）

本文件定义 Codex 在 `nextjs-starter-kit` 仓库中的默认行为规范。
除非用户在当前对话中明确覆盖，否则按以下规则执行。

## 1. 项目背景

- 技术栈：`Next.js (App Router) + React 19 + TypeScript + Tailwind CSS`
- 请求层：`alova`，现有封装位于 `src/utils/alova.ts`，业务请求示例位于 `src/services/`
- 包管理与工具链：Vite+ (`vp`) + `pnpm`
- 部署：GitHub Actions 构建 Docker 镜像并推送到 GHCR，再通过 SSH 登录服务器执行 Docker Compose 拉取镜像并重启服务。
- Node 版本要求：`22.x`
- 主要代码目录：`src/`（包含 `app/`、`components/`、`constants/`、`lib/`、`services/`、`styles/`、`utils/` 等）
- 主要配置文件：`package.json`、`vite.config.ts`、`next.config.ts`、`tsconfig.json`、`postcss.config.mjs`
- 部署相关文件：`Dockerfile`、`docker-compose.prod.yml`、`.github/workflows/deploy.yml`、`scripts/deploy-compose.sh`

## 2. 工作优先级

1. 正确性优先：先保证功能和行为正确，再考虑重构。
2. 最小改动优先：仅修改和需求直接相关的文件与代码路径。
3. 可验证优先：改动后要说明建议用户手动执行的最小必要检查。
4. 与现有风格一致：遵守当前项目 Vite+ lint/format、Prettier、Stylelint 规范。

## 3. 执行流程

1. 先理解需求与影响范围，再动手改代码。
2. 先查现有实现（`src/app/` 路由、`src/services/` 请求封装、`src/components/` 组件、`src/utils/`、`src/lib/`），优先复用。
3. 修改完成后默认不主动执行构建、lint、test、`vp check` 等生成构建和代码检测相关命令；仅列出建议用户手动执行的最小必要校验命令。用户明确要求执行时再运行。
4. 公开仓库在提交、发布或用户要求检查时，需要检查是否包含隐私或敏感数据；重点覆盖 `.env*`、部署配置、GitHub Actions、Docker/Compose、源码、文档、Git 跟踪文件与必要的 Git 历史。
5. 隐私与敏感数据检查至少关注：密钥、token、密码、私钥、真实服务器地址、数据库连接串、Webhook、第三方服务凭证、个人邮箱/手机号、内部业务地址与生产环境配置；发现风险时先报告并给出最小修复建议。
6. 检测到用户明确提出“提交代码”指令时，默认不主动执行构建、lint、test、`vp check` 等校验命令；应先提示建议用户手动校验，用户确认提交后再提交代码。若用户明确要求 Codex 执行校验，则在校验通过后提交代码。
7. 提交说明必须参考 [conventional-changelog/commitlint](https://github.com/conventional-changelog/commitlint) 的 Conventional Commits 风格，格式为 `type(scope?): subject`；`scope` 可选，`subject` 必须使用简洁英文说明本次改动。
8. commit 内容必须使用英文，不使用中文提交说明。
9. 常用提交类型包括：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。
10. 输出时必须说明：

- 改了哪些文件
- 为什么这样改
- 建议用户手动执行的校验命令；如用户明确要求 Codex 执行，则说明执行结果
- 未覆盖的风险（如果有）

## 4. 常用命令基线

- 安装依赖：`vp install`
- 本地开发：`vp run dev`（端口 8060）
- 生产构建：`vp run build`
- Docker 生产构建：`docker build --target runner -t nextjs-starter-kit:local .`
- 服务器部署脚本：`APP_IMAGE=<image> scripts/deploy-compose.sh <production|development>`
- 启动生产服务：`vp run start`（端口 8062）
- 代码检查：`vp check` 或 `vp run lint`
- 自动修复：`vp run lint:fix`
- 测试：`vp test`；CI 统一使用 `vp run verify`
- Vite+ 帮助：`vp help`

当改动涉及以下范围时，默认仅建议用户手动执行对应命令；用户明确要求 Codex 执行时再运行：

- TS 类型、公共工具函数、路由、`next.config.ts`、`tsconfig.json` 等构建配置 -> 建议 `vp check`；影响面较大时建议 `vp run build`
- 样式文件（`*.css`、`*.less`、`*.scss`） -> 建议 `vp run lint` 或更小范围的 Stylelint 检查
- `vite.config.ts`、`package.json`、依赖与工具链配置 -> 建议 `vp install` + `vp check`，必要时建议 `vp env doctor`
- `Dockerfile`、`docker-compose*.yml`、`.github/workflows/deploy.yml` 或 `scripts/deploy-compose.sh` -> 建议检查对应 Docker / GitHub Actions / Compose 流程，必要时建议针对性构建或脚本校验
- 新增或修改测试后 -> 建议 `vp test`

## 5. 代码修改约束

- 默认不做大规模无关重构。
- 不随意改动构建配置（`next.config.ts`、`tsconfig.json`、`vite.config.ts`、`package.json`、`Dockerfile`、`docker-compose*.yml`、`.github/workflows/deploy.yml`、Stylelint/Prettier 配置），除非需求明确要求。
- 不引入与需求无关的新依赖；如确需引入，须说明用途与体积影响。
- 避免重复实现：已有工具函数（`src/utils/`）、请求封装（`src/utils/alova.ts`、`src/services/`）、组件可复用时不要新增平行实现。
- 单文件代码行数上限：每个页面（`src/app/**/page.tsx`、`layout.tsx` 等）、每个组件文件不得超过 500 行（含注释与空行）；超过时必须按职责拆分为子组件 / 子模块，不允许通过删注释、压行等方式绕过该限制。
- App Router 中区分 Server Component / Client Component，需要 `"use client"` 时务必显式声明，且只在确有客户端交互时使用。
- `useEffect` 只能写在组件 `return` 的 DOM 节点之前。
- 涉及密钥/凭证只能通过环境变量读取，禁止硬编码或提交到仓库。
- 多个异步任务并发执行时，只使用 `Promise.allSettled`，不使用 `Promise.all`；必须显式处理 `fulfilled` 与 `rejected` 两种状态，并根据业务语义决定是否中断后续流程。
- 仅事件处理函数 / 用户操作回调方法名使用 `on` 前缀，例如 `onFinish`、`onClick`、`onSubmit`、`onCancel`、`onUpload`；纯工具函数、格式化函数、数据获取函数、创建函数、计算函数等不要使用 `on` 前缀，应使用 `get`、`format`、`create`、`fetch`、`validate`、`build` 等语义化动词。
- 仅针对 `utils` 目录下所有文件，以及路径或文件名包含 `utils` 的文件：工具函数必须使用 `function` 声明形式，禁止使用 `const` + 箭头函数形式（如 `const foo = () => {}`）。
- 仅针对 `utils` 目录下所有文件，以及路径或文件名包含 `utils` 的文件：注释必须遵循 `https://yuri4ever.github.io/jsdoc/#@file` 的 JSDoc 规范。
- 在上述 `utils` 范围内，每个文件头部必须有 JSDoc `@file` 注释块。
- 在上述 `utils` 范围内，工具函数的 JSDoc 注释必须包含：`@func` 与 `@desc`。
- 在上述 `utils` 范围内，工具函数必须补充 JSDoc 注释，至少包含：`@param`（有入参时）与 `@returns`（有返回值时）；必要时增加 `@throws`、`@example`。
- 对复杂逻辑可加简短注释，注释应解释“为什么”，不是“做了什么”。

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
