-- RBAC 重构：系统用户拆到 system_users，角色 / 权限 / 用户角色改为 TEXT 主键的菜单资源模型。
--
-- 数据处理口径：
-- - 平台用户（users）全部保留，只新增限制 / 封禁的原因与截止时间两列；平台用户从此没有角色体系；
-- - 当前仍持有有效 SUPER_ADMIN / ADMIN 角色、且设置了密码的账号，复制一份到 system_users：
--   沿用原 id 与密码 hash，登录账号取小写邮箱，原平台账号及其 AI 数据不受影响；
-- - 旧权限码（AI:CHAT:USE 等站点权限）整体作废，菜单与按钮资源由 prisma:seed 重新写入；
-- - 角色只保留 SUPER_ADMIN、被迁移系统用户仍在用的角色、以及后台自建的非系统角色，SITE_USER 删除。
--   除 SUPER_ADMIN 外一律标记为非系统角色，避免被角色种子当作废弃系统角色连同用户绑定一起清掉；
--   这些角色迁移后不带任何权限，需要超级管理员在角色管理里重新授权。

-- 1. 平台用户状态原因与截止时间
ALTER TABLE "users" ADD COLUMN "status_reason" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "status_expires_at" TIMESTAMPTZ(6);
CREATE INDEX "users_status_idx" ON "users"("status");

-- 2. 系统用户
CREATE TABLE "system_users" (
    "id" TEXT NOT NULL,
    "account" VARCHAR(100) NOT NULL,
    "password" TEXT NOT NULL,
    "username" VARCHAR(100),
    "nickname" TEXT,
    "avatar" TEXT,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),
    "status" "UserStatusType" NOT NULL DEFAULT 'active',

    CONSTRAINT "system_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_users_account_key" ON "system_users"("account");
CREATE INDEX "system_users_status_idx" ON "system_users"("status");
CREATE INDEX "system_users_created_at_idx" ON "system_users"("created_at" DESC);

-- 旧版本判定「能进后台」的口径：未撤销、在生效区间内、角色已启用的 SUPER_ADMIN / ADMIN 授权
CREATE TEMP TABLE "_rbac_active_bindings" AS
SELECT ur."user_id", ur."role_id", r."code" AS "role_code", ur."created_at"
FROM "user_roles" ur
JOIN "roles" r ON r."id" = ur."role_id"
WHERE ur."revoked_at" IS NULL
  AND (ur."valid_from" IS NULL OR ur."valid_from" <= now())
  AND (ur."valid_until" IS NULL OR ur."valid_until" > now())
  AND r."status" = 'ENABLED';

-- 账号上限 100 字符，超长邮箱无法作为账号，这类管理员需要改用 BOOTSTRAP_ADMIN_* 重新创建；
-- 历史数据里仅大小写不同的邮箱按注册时间取最早的一个，避免撞 account 唯一约束
INSERT INTO "system_users" (
    "id", "account", "password", "username", "nickname", "avatar", "remark",
    "created_at", "updated_at", "last_login_at", "status"
)
SELECT DISTINCT ON (lower(u."email"))
    u."id",
    lower(u."email"),
    u."password_hash",
    left(coalesce(nullif(u."full_name", ''), nullif(u."nick_name", ''), split_part(u."email", '@', 1)), 100),
    u."nick_name",
    u."picture",
    '由平台管理员账号迁移',
    u."created_at",
    now(),
    u."last_login_at",
    u."status"
FROM "users" u
WHERE u."is_deleted" = false
  AND u."email" IS NOT NULL
  AND length(u."email") <= 100
  AND u."password_hash" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "_rbac_active_bindings" b
    WHERE b."user_id" = u."id" AND b."role_code" IN ('SUPER_ADMIN', 'ADMIN')
  )
ORDER BY lower(u."email"), u."created_at";

-- 3. 需要保留的角色与用户角色绑定，暂存后重建表
CREATE TEMP TABLE "_rbac_roles" AS
SELECT
    r."id" AS "old_id",
    gen_random_uuid()::TEXT AS "new_id",
    left(r."code", 50) AS "code",
    r."name",
    r."description",
    r."code" = 'SUPER_ADMIN' AS "is_system",
    r."status",
    r."created_at"
FROM "roles" r
WHERE r."code" <> 'SITE_USER'
  AND (
    r."code" = 'SUPER_ADMIN'
    OR r."is_system" = false
    OR EXISTS (
      SELECT 1 FROM "_rbac_active_bindings" b
      JOIN "system_users" su ON su."id" = b."user_id"
      WHERE b."role_id" = r."id"
    )
  );

CREATE TEMP TABLE "_rbac_user_roles" AS
SELECT b."user_id", m."new_id" AS "role_id", min(b."created_at") AS "created_at"
FROM "_rbac_active_bindings" b
JOIN "system_users" su ON su."id" = b."user_id"
JOIN "_rbac_roles" m ON m."old_id" = b."role_id"
GROUP BY b."user_id", m."new_id";

-- 旧表的外键、排他约束与索引随表一起删除
DROP TABLE "role_permissions";
DROP TABLE "user_roles";
DROP TABLE "permissions";
DROP TABLE "roles";

-- 4. 权限类型补充菜单资源的 directory / menu / button
DROP TYPE "PermissionType";
CREATE TYPE "PermissionType" AS ENUM ('directory', 'menu', 'button', 'system', 'module', 'page', 'operation', 'data');

-- 5. 重建角色、权限及关联表
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "remark" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "status" "RoleStatus" NOT NULL DEFAULT 'ENABLED',

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE INDEX "roles_status_idx" ON "roles"("status");

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "path" VARCHAR(255),
    "icon" VARCHAR(100),
    "is_show" BOOLEAN NOT NULL DEFAULT true,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "keep_alive" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "type" "PermissionType" NOT NULL DEFAULT 'operation',

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");
CREATE INDEX "permissions_parent_id_idx" ON "permissions"("parent_id");
CREATE INDEX "permissions_enable_sort_created_at_idx" ON "permissions"("enable", "sort", "created_at");

CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

ALTER TABLE "permissions" ADD CONSTRAINT "permissions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "system_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. 回填保留的角色与绑定；角色名唯一，旧数据里的重名角色按编码区分
INSERT INTO "roles" ("id", "code", "name", "description", "remark", "created_at", "updated_at", "is_system", "enable", "status")
SELECT
    "new_id",
    "code",
    CASE
      WHEN row_number() OVER (PARTITION BY "name" ORDER BY "old_id") = 1 THEN left("name", 50)
      ELSE left("name" || '_' || "code", 50)
    END,
    left("description", 255),
    left("description", 255),
    "created_at",
    now(),
    "is_system",
    "status" = 'ENABLED',
    "status"
FROM "_rbac_roles";

INSERT INTO "user_roles" ("id", "user_id", "role_id", "created_at")
SELECT gen_random_uuid()::TEXT, "user_id", "role_id", "created_at"
FROM "_rbac_user_roles";

DROP TABLE "_rbac_user_roles";
DROP TABLE "_rbac_roles";
DROP TABLE "_rbac_active_bindings";
