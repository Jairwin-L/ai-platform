INSERT INTO "roles" ("code", "name", "description", "is_system", "status", "updated_at")
VALUES
  ('SITE_USER', '站点用户', '默认拥有站点全部功能权限', true, 'ENABLED', now())
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "is_system" = true,
  "status" = 'ENABLED',
  "updated_at" = now();

WITH site_role AS (
  SELECT "id"
  FROM "roles"
  WHERE "code" = 'SITE_USER'
),
site_permissions AS (
  SELECT "id"
  FROM "permissions"
  WHERE "code" IN (
    'ARTICLES',
    'ARTICLES:MANAGEMENT',
    'ARTICLES:VIEW',
    'ARTICLES:ADD',
    'ARTICLES:EDIT',
    'ARTICLES:DELETE'
  )
)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT site_role."id", site_permissions."id"
FROM site_role
CROSS JOIN site_permissions
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

DELETE FROM "role_permissions"
USING "roles", "permissions"
WHERE "role_permissions"."role_id" = "roles"."id"
  AND "role_permissions"."permission_id" = "permissions"."id"
  AND "roles"."code" IN (
    'SUPER_ADMIN',
    'ADMIN',
    'OPERATOR',
    'APPROVER',
    'AUDITOR',
    'READ_ONLY'
  )
  AND "permissions"."code" IN (
    'ARTICLES',
    'ARTICLES:MANAGEMENT',
    'ARTICLES:VIEW',
    'ARTICLES:ADD',
    'ARTICLES:EDIT',
    'ARTICLES:DELETE'
  );
