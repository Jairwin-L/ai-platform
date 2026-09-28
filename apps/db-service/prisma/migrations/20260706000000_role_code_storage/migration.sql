DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleStatus') THEN
    CREATE TYPE "RoleStatus" AS ENUM ('ENABLED', 'DISABLED');
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "status" "RoleStatus" NOT NULL DEFAULT 'ENABLED';
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_by" TEXT;

ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "valid_from" TIMESTAMPTZ(6);
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "valid_until" TIMESTAMPTZ(6);
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_by" TEXT;
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now();
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "revoked_by" TEXT;
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ(6);
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now();

ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_role_id_key";

UPDATE "roles"
SET "code" = CASE lower("name")
  WHEN 'super_admin' THEN 'SUPER_ADMIN'
  WHEN 'admin' THEN 'ADMIN'
  WHEN 'operator' THEN 'OPERATOR'
  WHEN 'approver' THEN 'APPROVER'
  WHEN 'auditor' THEN 'AUDITOR'
  WHEN 'read_only' THEN 'READ_ONLY'
  WHEN 'user' THEN 'READ_ONLY'
  WHEN 'visitor' THEN 'READ_ONLY'
  ELSE upper(regexp_replace("name", '[^A-Za-z0-9]+', '_', 'g')) || '_' || "id"::TEXT
END
WHERE "code" IS NULL;

WITH duplicate_roles AS (
  SELECT
    "id",
    "code",
    min("id") OVER (PARTITION BY "code") AS keep_id
  FROM "roles"
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT DISTINCT duplicate_roles.keep_id, role_permissions.permission_id, role_permissions.created_at
FROM "role_permissions" role_permissions
INNER JOIN duplicate_roles ON duplicate_roles.id = role_permissions.role_id
WHERE duplicate_roles.id <> duplicate_roles.keep_id
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

WITH duplicate_roles AS (
  SELECT
    "id",
    "code",
    min("id") OVER (PARTITION BY "code") AS keep_id
  FROM "roles"
)
INSERT INTO "user_roles" (
  "user_id",
  "role_id",
  "valid_from",
  "valid_until",
  "assigned_by",
  "assigned_at",
  "revoked_by",
  "revoked_at",
  "created_at",
  "updated_at"
)
SELECT DISTINCT
  user_roles.user_id,
  duplicate_roles.keep_id,
  user_roles.valid_from,
  user_roles.valid_until,
  user_roles.assigned_by,
  user_roles.assigned_at,
  user_roles.revoked_by,
  user_roles.revoked_at,
  user_roles.created_at,
  user_roles.updated_at
FROM "user_roles" user_roles
INNER JOIN duplicate_roles ON duplicate_roles.id = user_roles.role_id
WHERE duplicate_roles.id <> duplicate_roles.keep_id
  AND NOT EXISTS (
    SELECT 1
    FROM "user_roles" existing_user_roles
    WHERE existing_user_roles.user_id = user_roles.user_id
      AND existing_user_roles.role_id = duplicate_roles.keep_id
      AND existing_user_roles.revoked_at IS NULL
      AND user_roles.revoked_at IS NULL
  );

WITH duplicate_roles AS (
  SELECT
    "id",
    "code",
    min("id") OVER (PARTITION BY "code") AS keep_id
  FROM "roles"
)
DELETE FROM "role_permissions"
USING duplicate_roles
WHERE role_permissions.role_id = duplicate_roles.id
  AND duplicate_roles.id <> duplicate_roles.keep_id;

WITH duplicate_roles AS (
  SELECT
    "id",
    "code",
    min("id") OVER (PARTITION BY "code") AS keep_id
  FROM "roles"
)
DELETE FROM "user_roles"
USING duplicate_roles
WHERE user_roles.role_id = duplicate_roles.id
  AND duplicate_roles.id <> duplicate_roles.keep_id;

WITH duplicate_roles AS (
  SELECT
    "id",
    "code",
    min("id") OVER (PARTITION BY "code") AS keep_id
  FROM "roles"
)
DELETE FROM "roles"
USING duplicate_roles
WHERE roles.id = duplicate_roles.id
  AND duplicate_roles.id <> duplicate_roles.keep_id;

ALTER TABLE "roles" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "roles_code_key" ON "roles" ("code");

INSERT INTO "roles" ("code", "name", "description", "is_system", "status", "updated_at")
VALUES
  ('SUPER_ADMIN', '超级管理员', '系统最高权限角色', true, 'ENABLED', now()),
  ('ADMIN', '管理员', '后台业务管理员', true, 'ENABLED', now()),
  ('OPERATOR', '操作员', '日常业务操作员', true, 'ENABLED', now()),
  ('APPROVER', '审批员', '审批人员', true, 'ENABLED', now()),
  ('AUDITOR', '审计员', '审计人员', true, 'ENABLED', now()),
  ('READ_ONLY', '只读用户', '普通只读角色', true, 'ENABLED', now())
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "is_system" = true,
  "status" = 'ENABLED',
  "updated_at" = now();

CREATE INDEX IF NOT EXISTS "roles_status_idx" ON "roles" ("status");
CREATE INDEX IF NOT EXISTS "roles_created_by_idx" ON "roles" ("created_by");
CREATE INDEX IF NOT EXISTS "roles_updated_by_idx" ON "roles" ("updated_by");
CREATE INDEX IF NOT EXISTS "user_roles_user_id_idx" ON "user_roles" ("user_id");
CREATE INDEX IF NOT EXISTS "user_roles_role_id_idx" ON "user_roles" ("role_id");
CREATE INDEX IF NOT EXISTS "user_roles_valid_from_valid_until_idx" ON "user_roles" ("valid_from", "valid_until");
CREATE INDEX IF NOT EXISTS "user_roles_assigned_by_idx" ON "user_roles" ("assigned_by");
CREATE INDEX IF NOT EXISTS "user_roles_revoked_by_idx" ON "user_roles" ("revoked_by");
CREATE INDEX IF NOT EXISTS "user_roles_revoked_at_idx" ON "user_roles" ("revoked_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_created_by_fkey') THEN
    ALTER TABLE "roles"
      ADD CONSTRAINT "roles_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_updated_by_fkey') THEN
    ALTER TABLE "roles"
      ADD CONSTRAINT "roles_updated_by_fkey"
      FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_assigned_by_fkey') THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_assigned_by_fkey"
      FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_revoked_by_fkey') THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_revoked_by_fkey"
      FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_valid_period_check') THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_valid_period_check"
      CHECK ("valid_until" IS NULL OR "valid_from" IS NULL OR "valid_until" > "valid_from");
  END IF;
END $$;

WITH duplicate_user_roles AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        user_id,
        role_id,
        COALESCE(valid_from, '-infinity'::TIMESTAMPTZ),
        COALESCE(valid_until, 'infinity'::TIMESTAMPTZ)
      ORDER BY id
    ) AS row_number
  FROM "user_roles"
  WHERE revoked_at IS NULL
)
DELETE FROM "user_roles"
USING duplicate_user_roles
WHERE user_roles.id = duplicate_user_roles.id
  AND duplicate_user_roles.row_number > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_effective_period_no_overlap'
  ) THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_effective_period_no_overlap"
      EXCLUDE USING gist (
        "user_id" WITH =,
        "role_id" WITH =,
        (tstzrange(
          COALESCE("valid_from", '-infinity'::TIMESTAMPTZ),
          COALESCE("valid_until", 'infinity'::TIMESTAMPTZ),
          '[]'
        )) WITH &&
      )
      WHERE ("revoked_at" IS NULL);
  END IF;
END $$;
