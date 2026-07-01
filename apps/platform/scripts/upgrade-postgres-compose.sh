#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  POSTGRES_UPGRADE_MODE=dump-restore scripts/upgrade-postgres-compose.sh <production|development>

Required environment variables:
  POSTGRES_UPGRADE_MODE  Must be "dump-restore" to run.

Optional environment variables:
  DEPLOY_ENV_FILE        Override env file. Defaults to .env.production or .env.development.
  COMPOSE_PROJECT_NAME   Override Compose project. Defaults to nextjs-starter-kit-prod or nextjs-starter-kit-dev.
  COMPOSE_FILE           Override Compose file. Defaults to docker-compose.prod.yml or docker-compose.dev.yml.
  POSTGRES_OLD_IMAGE     Old PostgreSQL image. Defaults to postgres:16-alpine.
  POSTGRES_IMAGE         Target PostgreSQL image. Defaults to postgres:18-alpine.
  POSTGRES_OLD_DATA_TARGET
                         Old PostgreSQL volume mount target. Defaults to /var/lib/postgresql/data.
  POSTGRES_DATA_TARGET   Target PostgreSQL volume mount target. Defaults to /var/lib/postgresql.
  COMPOSE_SERVICE        Compose app service to stop before dump. Defaults to app.
  POSTGRES_SERVICE       Compose PostgreSQL service. Defaults to postgres.
  POSTGRES_DUMP_DIR      Local dump output directory. Defaults to .postgres-upgrades.
EOF
}

environment="${1:-}"

if [[ -z "${environment}" || "${environment}" == "-h" || "${environment}" == "--help" ]]; then
  usage
  exit 0
fi

case "${environment}" in
  production | prod | main)
    default_env_file=".env.production"
    default_project_name="nextjs-starter-kit-prod"
    default_compose_file="docker-compose.prod.yml"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="nextjs-starter-kit-dev"
    default_compose_file="docker-compose.dev.yml"
    ;;
  *)
    echo "Unknown environment: ${environment}" >&2
    usage
    exit 1
    ;;
esac

if [[ "${POSTGRES_UPGRADE_MODE:-}" != "dump-restore" ]]; then
  echo "POSTGRES_UPGRADE_MODE=dump-restore is required for PostgreSQL major upgrades." >&2
  exit 1
fi

compose_file="${COMPOSE_FILE:-${default_compose_file}}"
env_file="${DEPLOY_ENV_FILE:-${default_env_file}}"
project_name="${COMPOSE_PROJECT_NAME:-${default_project_name}}"
app_image="${APP_IMAGE:-}"
migrate_image="${MIGRATE_IMAGE:-${app_image:+${app_image}-migrate}}"
app_service="${COMPOSE_SERVICE:-app}"
postgres_service="${POSTGRES_SERVICE:-postgres}"
old_image="${POSTGRES_OLD_IMAGE:-postgres:16-alpine}"
target_image="${POSTGRES_IMAGE:-postgres:18-alpine}"
old_data_target="${POSTGRES_OLD_DATA_TARGET:-/var/lib/postgresql/data}"
target_data_target="${POSTGRES_DATA_TARGET:-/var/lib/postgresql}"
dump_dir="${POSTGRES_DUMP_DIR:-.postgres-upgrades}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="${dump_dir}/${project_name}-${timestamp}.dump"
volume_name="${project_name}_postgres-$([[ "${environment}" == production || "${environment}" == prod || "${environment}" == main ]] && printf prod || printf dev)-data"
backup_volume="${volume_name}-backup-${timestamp}"

if [[ ! -f "${compose_file}" ]]; then
  echo "Missing compose file: ${compose_file}" >&2
  exit 1
fi

if [[ ! -f "${env_file}" ]]; then
  echo "Missing env file: ${env_file}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required." >&2
  exit 1
fi

mkdir -p "${dump_dir}"

compose() {
  local postgres_image="$1"
  local postgres_data_target="$2"
  shift 2
  local compose_env=(
    "COMPOSE_PROJECT_NAME=${project_name}"
    "POSTGRES_IMAGE=${postgres_image}"
    "POSTGRES_DATA_TARGET=${postgres_data_target}"
  )

  if [[ -n "${app_image}" ]]; then
    compose_env+=("APP_IMAGE=${app_image}")
  fi

  if [[ -n "${migrate_image}" ]]; then
    compose_env+=("MIGRATE_IMAGE=${migrate_image}")
  fi

  env "${compose_env[@]}" docker compose --env-file "${env_file}" -f "${compose_file}" "$@"
}

echo "Stopping app service before PostgreSQL dump: ${app_service}"
compose "${old_image}" "${old_data_target}" stop "${app_service}" || true

echo "Starting old PostgreSQL image for dump: ${old_image}"
compose "${old_image}" "${old_data_target}" up -d "${postgres_service}"

echo "Waiting for old PostgreSQL to become ready."
compose "${old_image}" "${old_data_target}" exec -T "${postgres_service}" sh -lc \
  'for i in $(seq 1 60); do pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" && exit 0; sleep 2; done; exit 1'

echo "Writing logical dump: ${dump_file}"
compose "${old_image}" "${old_data_target}" exec -T "${postgres_service}" sh -lc \
  'pg_dump --format=custom --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "${dump_file}"

echo "Creating raw data volume backup: ${backup_volume}"
docker volume create "${backup_volume}" >/dev/null
docker run --rm \
  -v "${volume_name}:/from:ro" \
  -v "${backup_volume}:/to" \
  alpine:3.22 \
  sh -lc 'cd /from && tar cf - . | tar xf - -C /to'

echo "Stopping old PostgreSQL and replacing data volume."
compose "${old_image}" "${old_data_target}" stop "${postgres_service}"
compose "${old_image}" "${old_data_target}" rm -f "${postgres_service}"
docker volume rm "${volume_name}" >/dev/null

echo "Starting target PostgreSQL image: ${target_image}"
compose "${target_image}" "${target_data_target}" up -d "${postgres_service}"

echo "Waiting for target PostgreSQL to become ready."
compose "${target_image}" "${target_data_target}" exec -T "${postgres_service}" sh -lc \
  'for i in $(seq 1 60); do pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" && exit 0; sleep 2; done; exit 1'

echo "Restoring logical dump into target PostgreSQL."
compose "${target_image}" "${target_data_target}" exec -T "${postgres_service}" sh -lc \
  'pg_restore --clean --if-exists --no-owner --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${dump_file}"

echo "PostgreSQL dump/restore upgrade complete."
echo "  dump:          ${dump_file}"
echo "  backup volume: ${backup_volume}"
