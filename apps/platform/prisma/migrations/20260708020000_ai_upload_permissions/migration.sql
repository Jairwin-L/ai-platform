INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
VALUES
  ('AI', 'AI', NULL, 'module'::"PermissionType", 'AI 模块', now()),
  ('UPLOAD', 'Upload', NULL, 'module'::"PermissionType", '上传模块', now())
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "parent_id" = EXCLUDED."parent_id",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "updated_at" = now();

WITH page_permission_seeds ("code", "name", "parent_code", "description") AS (
  VALUES
    ('AI:CHAT', 'AI Chat', 'AI', 'AI Chat 页面'),
    ('AI:SETTINGS', 'AI Settings', 'AI', 'AI 设置页面'),
    ('UPLOAD:MANAGEMENT', 'Upload Management', 'UPLOAD', '上传管理页面')
)
INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
SELECT
  page_permission_seeds."code",
  page_permission_seeds."name",
  parent_permissions."id",
  'page'::"PermissionType",
  page_permission_seeds."description",
  now()
FROM page_permission_seeds
INNER JOIN "permissions" parent_permissions ON parent_permissions."code" = page_permission_seeds."parent_code"
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "parent_id" = EXCLUDED."parent_id",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "updated_at" = now();

WITH operation_permission_seeds ("code", "name", "parent_code", "description") AS (
  VALUES
    ('AI:CHAT:USE', 'AI Chat:Use', 'AI:CHAT', 'AI Chat:使用'),
    ('AI:SETTINGS:VIEW', 'AI Settings:View', 'AI:SETTINGS', 'AI 设置:查看'),
    ('AI:SETTINGS:MANAGE', 'AI Settings:Manage', 'AI:SETTINGS', 'AI 设置:管理'),
    ('UPLOAD:CREATE', 'Upload:Create', 'UPLOAD:MANAGEMENT', '上传管理:上传文件'),
    ('UPLOAD:COMPRESS', 'Upload:Compress', 'UPLOAD:MANAGEMENT', '上传管理:压缩图片')
)
INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
SELECT
  operation_permission_seeds."code",
  operation_permission_seeds."name",
  parent_permissions."id",
  'operation'::"PermissionType",
  operation_permission_seeds."description",
  now()
FROM operation_permission_seeds
INNER JOIN "permissions" parent_permissions ON parent_permissions."code" = operation_permission_seeds."parent_code"
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "parent_id" = EXCLUDED."parent_id",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
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
    'AI',
    'AI:CHAT',
    'AI:CHAT:USE',
    'AI:SETTINGS',
    'AI:SETTINGS:VIEW',
    'AI:SETTINGS:MANAGE',
    'UPLOAD',
    'UPLOAD:MANAGEMENT',
    'UPLOAD:CREATE',
    'UPLOAD:COMPRESS'
  )
)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT site_role."id", site_permissions."id"
FROM site_role
CROSS JOIN site_permissions
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
