# @ai/db-service

NestJS 12 接口服务：持有 Prisma schema / 迁移 / seed、Redis 会话与限流，承载 platform 前台与 admin 管理后台的全部接口。

## 路由命名空间

| 前缀                                                                    | 调用方                                                      | 鉴权                                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/platform/*`                                                           | platform（浏览器 `/api/*` 经 Next rewrites 转发；SSR 直连） | `auth_session` Cookie（`Auth` / `OptionalAuth` / `ByokAuth` / `AiAuth`，平台用户没有角色，登录即可；受限用户只读）        |
| `/upload/*`、`/compress/*`                                              | platform（`/api/upload`、`/api/compress`）                  | `Auth`                                                                                                                    |
| `/auth/*`、`/system-settings`、`/ai-providers`、`/third-party-services` | admin                                                       | `admin_session` Cookie（系统用户，`AdminPermissionAuth` / `AdminAnyPermissionAuth` 按权限码鉴权，`SUPER_ADMIN` 直接放行） |
| `/doc`                                                                  | 开发者                                                      | 生产环境默认隐藏，`ENABLE_API_DOCS=true` 开启                                                                             |

## 账号与权限（RBAC）

- 平台注册用户（`users`）只走前台邮箱登录，没有角色体系；后台可将其设为受限（只读）、停用或封禁，限制与封禁可设截止时间，到期自动恢复。
- 管理端系统用户（`system_users`）按账号登录，通过 `user_roles` 持有角色；角色通过 `role_permissions` 授予 `permissions` 里的菜单 / 按钮资源。
- 菜单与按钮资源以 `prisma/data/menu/data.ts` 为准覆盖式同步，按钮权限码与 `@ai/constants/permissions` 的 `PERMISSION_CODE` 一一对应；管理端侧边栏由 `/auth/menus` 返回的资源树生成。
- 种子（`prisma/data`）：`menu/` 菜单资源、`role/` 内置角色（`SUPER_ADMIN` 全部权限、`VISITOR` 仅工作台）、`bootstrap-admin.ts` 首个超级管理员。`prisma:seed` 只在 RBAC 未初始化时写入菜单与角色（`rbac.ts`），之后需要刷新时执行 `prisma:seed:menu` / `prisma:seed:role`，部署时设置 `FORCE_MENU_SEED` / `FORCE_ROLE_SEED=true`。
- 授权类操作（改角色权限、分配角色、建号）不能授出操作者自己没有的权限；`SUPER_ADMIN` 的绑定只能通过 `prisma:bootstrap-admin` 配置。
- 平台用户与 RBAC 表（`users`、`system_users`、`user_roles`、`roles`、`role_permissions`、`permissions`）主键是 TypeID（`user_01k5y0m0v8e7tbq3s2w6h9d4xn`），由 `prisma/data/id.ts` 的 `createId` 生成，schema 里没有 `@default`，新建时必须显式传 id。

## 目录

```
prisma/          schema、migrations、seed 数据（prisma/data）
src/common/      装饰器、守卫、过滤器、拦截器、中间件、zod 公共 schema
src/infra/       Prisma、Redis、Session、权限缓存、限流、验证码、邮件、加密、图片压缩
src/modules/     业务模块（auth：会话与管理端 RBAC / users：平台用户资料 / system-settings / ai / articles / upload / compress ...）
src/lib/         AI Provider、BYOK、第三方服务凭证（沿用原 platform 实现）
docs/            BYOK 安全设计说明
tests/           vitest 单测
```

## 本地开发

```bash
cp apps/db-service/.env.example apps/db-service/.env   # 填入本地 DATABASE_URL / REDIS_URL 等
vpr @ai/db-service#prisma:setup                          # 推送结构 + seed
vpr dev:service                                          # http://localhost:8070，文档 /doc
```

## 部署

- `Dockerfile --target runner`：运行镜像（容器端口 8072）。
- `Dockerfile --target migrator`：迁移 / seed / bootstrap-admin 工具镜像。
- 生产环境在反向代理之后运行，`BYOK_TRUST_PROXY_HEADERS` 需为 `true`，`CORS_ALLOWED_ORIGINS` 需包含管理后台域名。
