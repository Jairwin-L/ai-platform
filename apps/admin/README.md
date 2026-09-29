# @ai/admin

Vite + React 19 + react-router + Ant Design 6 管理后台，静态部署，接口直连 db-service。

## 功能

- 登录：系统用户按账号登录，密码使用 db-service 下发的 RSA 公钥加密传输，会话为 db-service 下发的 HttpOnly Cookie（`admin_session`），前端不持有也不存储任何 token。
- 业务管理：平台用户（限制 / 停用 / 封禁）。
- 系统管理：用户、角色、菜单权限。
- 系统配置：基础配置、AI Provider、第三方服务。

## 目录结构

```
src/
  api/            请求层：http（alova 实例 + 全局提示）/ request（get/post/...）/ methods（按模块拆分的接口）
  components/     通用组件：form-items（配置化表单项）、exception（可重试异常页）、auto-center、
                  resource-page（列表 / 表单页公共样式）、role-user-assign-modal 等
  constants/      环境、antd 预设（SELECT_OPTION / MODAL_OPTION）、分页、用户状态等常量
  hooks/          列表页公共逻辑（分页 / 搜索 / 刷新 / 失败态）、表格高度自适应、按钮级权限
  layout/         侧边栏 + 顶栏外壳、菜单构建、菜单选中态计算
  pages/          业务页面：auth / main / business / system
  router/         路由注册表：本地路由 ↔ 服务端权限资源的映射
  stores/         zustand 会话状态
  styles/         全局样式与 scss 变量、mixin
  utils/          管理端特有工具（日期、zod → antd 校验规则）
```

跨端可复用的纯函数与常量走 `@ai/utils`、`@ai/constants`，不在本包重复实现。

## 页面约定

- 每个模块按职责拆分：`index.tsx`（列表）、`form.tsx`（新建 / 编辑共用）、`columns.tsx`（列定义工厂）、
  `form-item-config.tsx`（表单项配置，交给 `FormItems` 渲染）、`schemas.ts`（zod schema + `createZodFormRules` 生成的字段规则）。
- 表单校验只写一份 zod schema：字段规则由 `createZodFormRules` 派生，提交时再用同一份 schema 解析出归一化后的请求参数。
- 数据加载失败统一渲染 `Exception` 并提供重试；接口成功 / 失败提示由 `src/api/http.ts` 全局处理，页面不重复弹提示。
- 站内跳转统一用 `useNavigate()`，不要用 `a href` 等整页刷新的方式（会重新拉取会话与菜单）。

## 界面规范

视觉与交互以 [Ant Design design.md](https://ant.design/design.md)（v6 默认亮色主题）为准，
具体约束见仓库根目录 `AGENTS.md` 第 5 节「管理端界面规范」。

- antd 组件主题：`src/app.tsx` 的 `ConfigProvider theme`
- 自定义样式 token：`src/styles/variable.scss`、`src/styles/mixin.scss`（由 `vite.config.ts` 注入到每个 scss 文件），与上面的主题保持同步

## 菜单与路由

侧边栏来自 db-service 的 `/auth/menus` 权限树，`src/router/route-registry.tsx` 负责把权限记录映射到本地路由，
`code` / `path` 任一命中即可。权限表尚未初始化时超级管理员回落到本地静态菜单与全量路由，
普通系统用户只注册被授权的页面；真正的越权拦截由服务端 `AdminPermissionAuth` 负责。

## 本地开发

```bash
cp apps/admin/.env.example apps/admin/.env.local
vpr dev:service     # 先启动 db-service（8070）
vpr dev:admin       # http://localhost:8050，/api 由 vite 代理到 db-service
```

## 环境变量

| 变量                  | 说明                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `VITE_APP_TITLE`      | 浏览器标题与侧边栏文案                                            |
| `VITE_BASE_API_URL`   | 接口基址，本地默认 `/api`（经 vite 代理），线上填 db-service 地址 |
| `VITE_DEV_API_TARGET` | 仅开发态：vite 代理转发的 db-service 地址                         |
| `VITE_PLATFORM_URL`   | 顶栏「前台站点」入口，留空则不显示                                |

`VITE_*` 在构建期内联进产物，只能放公开信息，禁止写入任何密钥；真实值只放本地 `.env.local` 或部署平台变量，`.env*`（除 `.env.example`）均不入库。

## 构建与部署

```bash
VITE_BASE_API_URL=https://api.example.com vpr build:admin   # 产物在 apps/admin/dist
```

- 线上直连 db-service 时，需把管理后台域名加入 db-service 的 `CORS_ALLOWED_ORIGINS`；跨站部署时注意 Cookie 的 SameSite 策略，推荐让管理后台与接口同站（同一注册域）或由同域反向代理转发 `/api`。
- GitHub Actions 在配置了 `DEPLOY_ADMIN_PATH` 时自动把 `dist` 同步到服务器目录。
