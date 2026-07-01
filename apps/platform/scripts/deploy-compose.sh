#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  APP_IMAGE=<image> scripts/deploy-compose.sh <production|development>
  scripts/deploy-compose.sh <production|development> <image>

Optional environment variables:
  DEPLOY_ENV_FILE        Override env file. Defaults to .env.production or .env.development.
  COMPOSE_PROJECT_NAME   Override Compose project. Defaults to nextjs-starter-kit-prod or nextjs-starter-kit-dev.
  COMPOSE_FILE           Override Compose file. Defaults to docker-compose.prod.yml or docker-compose.dev.yml.
  COMPOSE_SERVICE        Override Compose service. Defaults to app.
  MIGRATE_IMAGE          Override migration image. Defaults to APP_IMAGE-migrate.
  POSTGRES_IMAGE         Override PostgreSQL image. Defaults to postgres:18-alpine.
  POSTGRES_DATA_TARGET   PostgreSQL volume mount target. Defaults to /var/lib/postgresql.
  POSTGRES_OLD_IMAGE     Old PostgreSQL image for major upgrade. Defaults to postgres:16-alpine.
  POSTGRES_UPGRADE_MODE  Set to "dump-restore" to run PostgreSQL major upgrade before migrations.
  PRISMA_SYNC_COMMAND    Override Prisma sync command. Defaults to "vp run prisma:push:deploy".
  PRISMA_SEED_COMMAND    Override Prisma seed command. Defaults to "vp run prisma:seed:deploy".
  BOOTSTRAP_ADMIN_EMAIL  Email address that should receive the admin role. May be provided by the env file.
  BOOTSTRAP_ADMIN_STRICT Set to "true" to fail when BOOTSTRAP_ADMIN_EMAIL user is missing.
  BOOTSTRAP_ADMIN_COMMAND
                         Override admin bootstrap command. Defaults to "vp run prisma:bootstrap-admin:deploy".

Examples:
  APP_IMAGE=ghcr.io/jairwin-l/nextjs-starter-kit:latest scripts/deploy-compose.sh production
  scripts/deploy-compose.sh development ghcr.io/jairwin-l/nextjs-starter-kit:dev
EOF
}

environment="${1:-}"
image="${APP_IMAGE:-${2:-}}"

if [[ -z "${environment}" || "${environment}" == "-h" || "${environment}" == "--help" ]]; then
  usage
  exit 0
fi

case "${environment}" in
  production | prod | main)
    default_env_file=".env.production"
    default_project_name="nextjs-starter-kit-prod"
    default_compose_file="docker-compose.prod.yml"
    default_app_port="8062"
    default_postgres_db="nextjs_starter_kit"
    default_postgres_user="nextjs_starter_kit"
    default_postgres_password="nextjs_starter_kit"
    default_postgres_image="postgres:18-alpine"
    default_database_url="postgresql://nextjs_starter_kit:nextjs_starter_kit@postgres:5432/nextjs_starter_kit?schema=public"
    default_prisma_sync_command="vp run prisma:push:deploy"
    default_prisma_seed_command="vp run prisma:seed:deploy"
    default_bootstrap_admin_command="vp run prisma:bootstrap-admin:deploy"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="nextjs-starter-kit-dev"
    default_compose_file="docker-compose.dev.yml"
    default_app_port="8060"
    default_postgres_db="nextjs_starter_kit_dev"
    default_postgres_user="nextjs_starter_kit"
    default_postgres_password="nextjs_starter_kit"
    default_postgres_image="postgres:18-alpine"
    default_database_url="postgresql://nextjs_starter_kit:nextjs_starter_kit@postgres:5432/nextjs_starter_kit_dev?schema=public"
    default_prisma_sync_command="vp run prisma:push:deploy"
    default_prisma_seed_command="vp run prisma:seed:deploy"
    default_bootstrap_admin_command="vp run prisma:bootstrap-admin:deploy"
    ;;
  *)
    echo "Unknown environment: ${environment}" >&2
    usage
    exit 1
    ;;
esac

if [[ -z "${image}" ]]; then
  echo "APP_IMAGE is required. Pass it as an environment variable or second argument." >&2
  usage
  exit 1
fi

compose_file="${COMPOSE_FILE:-${default_compose_file}}"
compose_service="${COMPOSE_SERVICE:-app}"
env_file="${DEPLOY_ENV_FILE:-${default_env_file}}"
project_name="${COMPOSE_PROJECT_NAME:-${default_project_name}}"
migrate_image="${MIGRATE_IMAGE:-${image}-migrate}"
prisma_sync_command="${PRISMA_SYNC_COMMAND:-${default_prisma_sync_command}}"
prisma_seed_command="${PRISMA_SEED_COMMAND:-${default_prisma_seed_command}}"
bootstrap_admin_command="${BOOTSTRAP_ADMIN_COMMAND:-${default_bootstrap_admin_command}}"

if [[ ! -f "${compose_file}" ]]; then
  echo "Missing compose file: ${compose_file}" >&2
  exit 1
fi

mkdir -p "$(dirname "${env_file}")"

if [[ ! -f "${env_file}" ]]; then
  echo "Missing env file: ${env_file}" >&2
  exit 1
fi

has_env_key() {
  local key="$1"

  grep -qE "^${key}[[:space:]]*=" "${env_file}"
}

read_env_value() {
  local key="$1"
  local line
  local value

  line="$(grep -E "^${key}[[:space:]]*=" "${env_file}" | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    return 0
  fi

  value="${line#*=}"
  if [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

get_postgres_major() {
  local image="$1"

  if [[ "${image}" =~ postgres:([0-9]+) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

get_postgres_data_volume() {
  case "${environment}" in
    production | prod | main)
      printf '%s_postgres-prod-data' "${project_name}"
      ;;
    *)
      printf '%s_postgres-dev-data' "${project_name}"
      ;;
  esac
}

get_existing_postgres_major() {
  local volume_name="$1"

  if ! docker volume inspect "${volume_name}" >/dev/null 2>&1; then
    return 0
  fi

  docker run --rm -v "${volume_name}:/pgdata:ro" alpine:3.22 \
    sh -lc 'version_file="$(find /pgdata -maxdepth 4 -type f -name PG_VERSION 2>/dev/null | head -n 1)"; if [ -n "${version_file}" ]; then cat "${version_file}"; fi'
}

append_env() {
  local key="$1"
  local value="$2"

  if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
    echo "Environment value for ${key} must be a single line." >&2
    exit 1
  fi

  value=${value//\'/\'\\\'\'}
  printf "%s='%s'\n" "${key}" "${value}" >> "${env_file}"
}

ensure_default_env() {
  local key="$1"
  local value="$2"

  if has_env_key "${key}"; then
    unset "${key}"
    return
  fi

  if [[ -n "${!key:-}" ]]; then
    append_env "${key}" "${!key}"
    return
  fi

  append_env "${key}" "${value}"
  export "${key}=${value}"
}

ensure_default_env APP_PORT "${default_app_port}"
ensure_default_env POSTGRES_DB "${default_postgres_db}"
ensure_default_env POSTGRES_USER "${default_postgres_user}"
ensure_default_env POSTGRES_PASSWORD "${default_postgres_password}"
ensure_default_env POSTGRES_IMAGE "${default_postgres_image}"
ensure_default_env POSTGRES_DATA_TARGET "/var/lib/postgresql"
ensure_default_env POSTGRES_OLD_IMAGE "postgres:16-alpine"
ensure_default_env DATABASE_URL "${default_database_url}"

postgres_image="${POSTGRES_IMAGE:-$(read_env_value POSTGRES_IMAGE)}"
postgres_old_image="${POSTGRES_OLD_IMAGE:-$(read_env_value POSTGRES_OLD_IMAGE)}"
postgres_upgrade_mode="${POSTGRES_UPGRADE_MODE:-$(read_env_value POSTGRES_UPGRADE_MODE)}"
bootstrap_admin_email="${BOOTSTRAP_ADMIN_EMAIL:-$(read_env_value BOOTSTRAP_ADMIN_EMAIL)}"
bootstrap_admin_strict="${BOOTSTRAP_ADMIN_STRICT:-$(read_env_value BOOTSTRAP_ADMIN_STRICT)}"
postgres_image="${postgres_image:-${default_postgres_image}}"
postgres_old_image="${postgres_old_image:-postgres:16-alpine}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required." >&2
  exit 1
fi

echo "Deploying ${environment}"
echo "  image:   ${image}"
echo "  migrate: ${migrate_image}"
echo "  project: ${project_name}"
echo "  env:     ${env_file}"
echo "  compose: ${compose_file}"
echo "  service: ${compose_service}"
echo "  prisma:  ${prisma_sync_command}"
echo "  seed:    ${prisma_seed_command}"
echo "  admin:   ${bootstrap_admin_command}"

if [[ -n "${postgres_upgrade_mode}" ]]; then
  if [[ "${postgres_upgrade_mode}" != "dump-restore" ]]; then
    echo "Unsupported POSTGRES_UPGRADE_MODE: ${postgres_upgrade_mode}" >&2
    exit 1
  fi

  POSTGRES_UPGRADE_MODE="${postgres_upgrade_mode}" \
    POSTGRES_OLD_IMAGE="${postgres_old_image}" \
    POSTGRES_IMAGE="${postgres_image}" \
    POSTGRES_DATA_TARGET="${POSTGRES_DATA_TARGET:-$(read_env_value POSTGRES_DATA_TARGET)}" \
    APP_IMAGE="${image}" \
    MIGRATE_IMAGE="${migrate_image}" \
    DEPLOY_ENV_FILE="${env_file}" \
    COMPOSE_PROJECT_NAME="${project_name}" \
    COMPOSE_FILE="${compose_file}" \
    COMPOSE_SERVICE="${compose_service}" \
    scripts/upgrade-postgres-compose.sh "${environment}"
fi

target_postgres_major="$(get_postgres_major "${postgres_image}")"
existing_postgres_major="$(get_existing_postgres_major "$(get_postgres_data_volume)")"

if [[ -n "${existing_postgres_major}" && -n "${target_postgres_major}" && "${existing_postgres_major}" != "${target_postgres_major}" ]]; then
  cat >&2 <<EOF
PostgreSQL data volume was created by PostgreSQL ${existing_postgres_major}, but POSTGRES_IMAGE targets PostgreSQL ${target_postgres_major}.
Run with POSTGRES_UPGRADE_MODE=dump-restore to migrate the Compose volume, or temporarily set POSTGRES_IMAGE=postgres:${existing_postgres_major}-alpine.
EOF
  exit 1
fi

compose() {
  COMPOSE_PROJECT_NAME="${project_name}" APP_IMAGE="${image}" MIGRATE_IMAGE="${migrate_image}" \
    docker compose --env-file "${env_file}" -f "${compose_file}" "$@"
}

COMPOSE_PROJECT_NAME="${project_name}" APP_IMAGE="${image}" MIGRATE_IMAGE="${migrate_image}" \
  docker compose --env-file "${env_file}" -f "${compose_file}" pull "${compose_service}" migrate

compose run --rm migrate sh -lc "${prisma_sync_command}"
compose run --rm migrate sh -lc "${prisma_seed_command}"
compose run --rm \
  -e "BOOTSTRAP_ADMIN_EMAIL=${bootstrap_admin_email}" \
  -e "BOOTSTRAP_ADMIN_STRICT=${bootstrap_admin_strict}" \
  migrate sh -lc "${bootstrap_admin_command}"

compose up -d --no-build "${compose_service}"

docker image prune -f
