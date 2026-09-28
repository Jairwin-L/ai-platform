WITH site_role AS (
  SELECT "id"
  FROM "roles"
  WHERE "code" = 'SITE_USER'
),
eligible_users AS (
  SELECT "id"
  FROM "users"
  WHERE "is_deleted" = false
    AND "status" = 'active'
)
INSERT INTO "user_roles" ("user_id", "role_id", "created_at", "updated_at")
SELECT eligible_users."id", site_role."id", now(), now()
FROM eligible_users
CROSS JOIN site_role
WHERE NOT EXISTS (
  SELECT 1
  FROM "user_roles" existing_user_roles
  WHERE existing_user_roles."user_id" = eligible_users."id"
    AND existing_user_roles."role_id" = site_role."id"
    AND existing_user_roles."revoked_at" IS NULL
);
