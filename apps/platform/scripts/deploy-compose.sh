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
    default_database_url="postgresql://nextjs_starter_kit:nextjs_starter_kit@postgres:5432/nextjs_starter_kit?schema=public"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="nextjs-starter-kit-dev"
    default_compose_file="docker-compose.dev.yml"
    default_app_port="8060"
    default_postgres_db="nextjs_starter_kit_dev"
    default_postgres_user="nextjs_starter_kit"
    default_postgres_password="nextjs_starter_kit"
    default_database_url="postgresql://nextjs_starter_kit:nextjs_starter_kit@postgres:5432/nextjs_starter_kit_dev?schema=public"
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
ensure_default_env DATABASE_URL "${default_database_url}"

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

compose() {
  COMPOSE_PROJECT_NAME="${project_name}" APP_IMAGE="${image}" MIGRATE_IMAGE="${migrate_image}" \
    docker compose --env-file "${env_file}" -f "${compose_file}" "$@"
}

COMPOSE_PROJECT_NAME="${project_name}" APP_IMAGE="${image}" MIGRATE_IMAGE="${migrate_image}" \
  docker compose --env-file "${env_file}" -f "${compose_file}" pull "${compose_service}" migrate

compose run --rm migrate

compose up -d --no-build "${compose_service}"

docker image prune -f
