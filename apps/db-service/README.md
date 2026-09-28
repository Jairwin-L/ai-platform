# @ai/db-service

NestJS 12 接口服务：持有 Prisma schema / 迁移 / seed、Redis 会话与限流，承载 platform 前台与 admin 管理后台的全部接口。

## 路由命名空间

| 前缀                                                                                                        | 调用方                                                      | 鉴权                                                                       |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/platform/*`                                                                                               | platform（浏览器 `/api/*` 经 Next rewrites 转发；SSR 直连） | `auth_session` Cookie（`Auth` / `PermissionAuth` / `ByokAuth` / `AiAuth`） |
| `/upload/*`、`/compress/*`                                                                                  | platform（`/api/upload`、`/api/compress`）                  | `PermissionAuth('UPLOAD:*')`                                               |
| `/auth/*`、`/users`、`/roles`、`/permissions`、`/system-settings`、`/ai-providers`、`/third-party-services` | admin                                                       | `admin_session` Cookie（`AdminAuth`，要求 `SUPER_ADMIN` / `ADMIN`）        |
| `/doc`                                                                                                      | 开发者                                                      | 生产环境默认隐藏，`ENABLE_API_DOCS=true` 开启                              |

## 目录

```
prisma/          schema、migrations、seed 数据（prisma/data）
src/common/      装饰器、守卫、过滤器、拦截器、中间件、zod 公共 schema
src/infra/       Prisma、Redis、Session、权限缓存、限流、验证码、邮件、加密、图片压缩
src/modules/     业务模块（auth / users / roles / permissions / system-settings / ai / articles / upload / compress ...）
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
