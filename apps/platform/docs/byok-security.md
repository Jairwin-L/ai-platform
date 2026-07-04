# BYOK Key Security

## 1. 接入策略

本项目的 BYOK 能力只实现服务端、Redis、接口、安全控制与测试，不包含前端页面。实现复用现有 session 认证、Redis 原语和 logger；BYOK 接口使用独立安全响应头，避免复用默认通配 CORS 响应。当前模型为多 API Key / 多 Provider 的 Credential 模型，同一用户可保存多条独立凭据。

## 2. 威胁模型与边界

- Redis、普通后台管理员、日志系统、埋点系统不能直接获取 API Key 明文。
- API Key 不是密码，服务端调用 Provider 时必须短暂恢复明文，因此使用可逆加密而不是哈希。
- 解密后的 API Key 只应存在于当前请求局部变量内，不写入日志、审计、响应、异常对象或全局缓存。
- 拥有服务器 Root 权限、生产部署权限、KMS / Vault 解密权限或进程内存调试权限的超级管理员，理论上仍可能获得明文。
- XSS、恶意浏览器扩展、被篡改的前端构建产物可能在用户输入 API Key 时窃取明文；需配合 CSP、依赖安全、代码审查、构建供应链保护与最小权限部署。
- 不要承诺“任何管理员绝对无法看到 API Key”。
- 不要把 API Key 存到浏览器本地存储，也不要通过 URL 参数传递。

## 3. 文件职责

- `src/lib/ai/byok/crypto.ts`: AES-256-GCM、AAD、密钥版本。
- `src/lib/ai/byok/encryption-key-provider.ts`: 环境变量密钥 Provider，预留 KMS / Vault 扩展。
- `src/lib/ai/byok/key-store.ts`: Credential Redis key、ZSET 索引、value、TTL、状态、删除。
- `src/lib/ai/byok/provider.ts`: 基于管理端 AI Provider 配置的协议、模型、URL allowlist 调用。
- `src/lib/ai/byok/schemas.ts`: Zod 请求校验。
- `src/lib/ai/byok/service.ts`: 保存、列表、删除、解密调用、无效 Credential 自动删除。
- `src/lib/ai/security/redact.ts`: 日志与错误上报脱敏。
- `src/lib/ai/security/error-reporting.ts`: Sentry / 监控上报前的脱敏 Hook。
- `src/lib/ai/security/request-security.ts`: HTTPS、Origin、Fetch Metadata、Content-Type、请求大小。
- `src/lib/ai/security/audit.ts`: 安全审计事件。

## 4. 环境变量

```env
AI_KEY_ENCRYPTION_KEY_V1=replace-with-32-byte-base64-secret
AI_KEY_REDIS_ID_SECRET=replace-with-independent-random-secret
BYOK_TRUST_PROXY_HEADERS=false
```

`AI_KEY_ENCRYPTION_KEY_V1` 必须是 32 字节 Base64，可用 `openssl rand -base64 32` 生成。`AI_KEY_REDIS_ID_SECRET` 必须是独立随机 secret，不能与加密主密钥共用，也不能使用 `NEXT_PUBLIC_*` 暴露。

## 5. Redis Key、Value、TTL 与 ACL

每条 Credential 使用独立 Redis key，格式为 `ai:byok:v1:{userHash}:{credentialId}`，其中 `userHash = HMAC-SHA-256(userId, AI_KEY_REDIS_ID_SECRET)`，不保存原始 userId。`credentialId` 由服务端生成，格式为 `cred_{32 hex}`，不接受客户端指定。

Redis value 只保存 `version`、`credentialId`、`provider`、`label`、`algorithm`、`keyVersion`、`ciphertext`、`iv`、`authTag`、`keyHint`、`createdAt`、`expiresAt`、`status`。禁止保存明文 API Key、原始 userId、客户端传入的 Provider Base URL、第三方完整响应和明文 Authorization Header。

AES-256-GCM 的 AAD 包含 `byok:v1:{userId}:{provider}:{credentialId}`，确保密文不能被调换到其他用户、Provider 或 Credential ID 下通过解密。

用户 Credential 列表使用 ZSET 索引 `ai:byok:index:{userHash}`，member 为 `credentialId`，score 为 `expiresAt` 秒级时间戳。列表查询只读取未过期 member，再逐条读取独立 Redis key；已不存在或 TTL 异常的 Credential 会从索引清理。列表响应只返回 `credentialId`、`provider`、`label`、`keyHint`、`remainingSeconds`、`expiresAt`、`lastUsedAt`、`status`，不会解密 API Key，也不会返回 `ciphertext`、`iv`、`authTag`。

保存 Credential 时使用 `SET ... EX` 原子写入 TTL，并维护 ZSET 索引。TTL 由用户提交的 `ttlOption` 决定，仅允许 `7d`、`2w`、`3w` 或 `4w`。状态查询只读取掩码字段和 TTL，不会解密 API Key。`TTL=-1` 视为安全配置异常，会立即 `DEL` 并从索引移除，同时记录审计。

Redis 不应暴露公网。应用应通过私网或 TLS 访问 Redis，并使用 ACL、密码和最小权限账号。BYOK 账号只需要访问 `ai:byok:*`，并授予 `GET`、`MGET`、`SET`、`DEL`、`TTL`、`ZADD`、`ZRANGEBYSCORE`、`ZREM`、`EXPIRE` 以及限流和并发控制所需的 `INCR`、`DECR`。

Redis TTL 到期表示在线 Redis 中的数据自动失效与删除；历史 RDB、AOF、备份、快照或灾备副本中可能仍保留加密后的历史密文。如要求物理销毁，需要额外配置备份保留与清理策略。

## 6. 接口

- `POST /api/user/ai-credentials`: 保存当前登录用户的一条 Credential，服务端生成 `credentialId`。
- `GET /api/user/ai-credentials`: 查询当前登录用户的 Credential 列表，只返回掩码信息和状态，不解密。
- `DELETE /api/user/ai-credentials/[credentialId]`: 删除当前登录用户的指定 Credential，不接受客户端传入 `userId`。
- `POST /api/ai/chat`: 请求体携带 `credentialId` 和显式 `model`，服务端根据当前登录用户和 Credential 归属读取管理端 AI Provider 配置并调用。

所有接口只从服务端 session 解析用户，不接受客户端传入的 `userId`、`role`、`redisKey`、Provider URL、Base URL 或模型 URL。保存 Credential 前只执行通用 API Key 格式校验，不会向第三方发起网络验证。Chat 请求不接受客户端传入 `provider`，Provider 只能来自服务端保存的 Credential。服务端按 Credential 的 Provider 读取当前启用的管理端配置，并使用配置中的模型 allowlist、协议和调用地址，避免跨 Provider 混用模型或接受客户端控制 URL。

## 7. 认证、HTTPS、CSRF、CORS、限流

所有 BYOK 接口要求登录态。生产环境只允许 HTTPS；状态变更接口必须提供并通过精确 Origin 校验，Cookie Session 场景下校验 `Sec-Fetch-Site`，默认不返回 `Access-Control-Allow-Origin: *`。BYOK 允许 Origin 只从管理系统配置读取，不使用 env 兜底；配置为空时保存、删除和聊天请求会被拒绝。只有在可信反向代理已经清洗客户端伪造头时，才可设置 `BYOK_TRUST_PROXY_HEADERS=true` 并信任 `X-Forwarded-Proto`。

限流维度为 `userId + IP + route`，保存 Credential 每小时 10 次，删除 Credential 每小时 20 次，AI Chat 每小时 120 次、每天 1000 次。AI Chat 额外限制单用户同一路由最多 3 个并发请求，同时限制请求体大小、消息条数、单条长度、总字符数，并按管理端 Provider 配置校验模型 allowlist。

## 8. 日志、审计与错误处理

全局 logger 已在写入 stdout/stderr 前调用递归脱敏，覆盖 `apiKey`、`authorization`、`x-api-key`、`cookie`、`ciphertext`、`iv`、`authTag`、`AI_KEY_ENCRYPTION_KEY*`、`AI_KEY_REDIS_ID_SECRET*`，并掩盖文本中的 `Bearer ...`、`sk-...`、`sk-proj-...`。接入 Sentry 或其他错误上报平台时应通过 `reportSanitizedError` 上报，确保异常对象、请求上下文和 Provider 错误片段先被脱敏。

审计事件只记录 `eventType`、`occurredAt`、`actorIdHash`、`provider`、`requestId`、`ipHash`、`result`、`reasonCode`，不记录 API Key、密文、IV、Auth Tag、Redis 原始 key、完整 IP 或完整 User-Agent。

## 9. 测试与建议命令

已补充 BYOK 加密、Redis 存储、Provider 失败语义、请求安全、限流并发、Route 响应头、脱敏与 logger 测试。建议手动执行：

```bash
vp test tests/byok-crypto.test.ts tests/byok-key-store.test.ts tests/byok-provider.test.ts tests/byok-service.test.ts tests/byok-request-security.test.ts tests/byok-rate-limit.test.ts tests/byok-routes.test.ts tests/byok-redact.test.ts tests/byok-logger.test.ts tests/byok-audit.test.ts
vp check
vp run build
```

## 10. 生产部署检查清单

- 为开发、测试、预发、生产分别配置不同 AES 主密钥和 Redis HMAC secret。
- 确认 `.env` 未被 Git 跟踪，真实 secret 不进入镜像、日志、错误上报或前端 bundle。
- 在管理系统配置中维护 BYOK 允许 Origin，只填写精确 origin，不使用通配符。
- seed 会预置常见 AI Provider 的协议、Chat Base URL、模型和 API Key 链接；上线前应在管理端确认这些配置符合当前使用的服务。
- Redis 使用私网或 TLS、ACL、密码、最小权限和 `ai:byok:*` key pattern。
- 关闭任何后台“查看用户 API Key”“查看 Redis 原始 Value”的能力。
- 配置 RDB、AOF、快照和灾备副本的加密、访问控制、保留期和销毁策略。
- 配置可信反向代理，确保 `X-Forwarded-Proto` 不被外部伪造，再启用 `BYOK_TRUST_PROXY_HEADERS=true`。
- 配置 CSP、依赖安全扫描、构建产物完整性和最小权限部署。

## 11. 无法完全防御的风险

本方案降低应用层、Redis、日志、监控与普通后台权限导致的泄露风险，但无法绝对防御拥有服务器 Root、生产部署、KMS / Vault 解密或进程内存调试权限的超级管理员。用户输入阶段的 XSS、恶意浏览器扩展或供应链篡改也可能获取明文，需要前端与部署链路配合治理。
