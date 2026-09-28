# @ai/admin

Vite + React 19 + react-router + Ant Design 6 管理后台，静态部署，接口直连 db-service。

## 功能

- 登录：仅 `SUPER_ADMIN` / `ADMIN` 可登录，密码使用 db-service 下发的 RSA 公钥加密传输，会话为 db-service 下发的 HttpOnly Cookie（`admin_session`）。
- 系统管理：用户、角色、权限、系统设置、AI Provider、第三方服务。

## 本地开发

```bash
cp apps/admin/.env.example apps/admin/.env.local
vpr dev:service     # 先启动 db-service（8070）
vpr dev:admin       # http://localhost:8050，/api 由 vite 代理到 db-service
```

## 构建与部署

```bash
VITE_BASE_API_URL=https://api.example.com vpr build:admin   # 产物在 apps/admin/dist
```

- `VITE_*` 在构建期内联进产物，只能放公开信息。
- 线上直连 db-service 时，需把管理后台域名加入 db-service 的 `CORS_ALLOWED_ORIGINS`；跨站部署时注意 Cookie 的 SameSite 策略，推荐让管理后台与接口同站（同一注册域）或由同域反向代理转发 `/api`。
- GitHub Actions 在配置了 `DEPLOY_ADMIN_PATH` 时自动把 `dist` 同步到服务器目录。
