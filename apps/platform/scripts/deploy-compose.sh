#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  APP_IMAGE=<image> scripts/deploy-compose.sh <production|development>
  scripts/deploy-compose.sh <production|development> <image>

Optional environment variables:
  DEPLOY_ENV_FILE        Override env file. Defaults to .env.production or .env.development.
  COMPOSE_PROJECT_NAME   Override Compose project. Defaults to nextjs-blank-template-prod or nextjs-blank-template-dev.
  COMPOSE_FILE           Override Compose file. Defaults to docker-compose.prod.yml.
  COMPOSE_SERVICE        Override Compose service. Defaults to app.
  MIGRATE_IMAGE          Override migration image. Defaults to APP_IMAGE-migrate.
  POSTGRES_PASSWORD      Required by docker-compose.prod.yml for the bundled PostgreSQL service.

Examples:
  APP_IMAGE=ghcr.io/jairwin-l/nextjs-blank-template:latest scripts/deploy-compose.sh production
  scripts/deploy-compose.sh development ghcr.io/jairwin-l/nextjs-blank-template:dev
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
    default_project_name="nextjs-blank-template-prod"
    default_compose_file="docker-compose.prod.yml"
    default_app_port="8062"
    default_postgres_db="nextjs_blank_template"
    default_postgres_user="nextjs_blank_template"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="nextjs-blank-template-dev"
    default_compose_file="docker-compose.prod.yml"
    default_app_port="8060"
    default_postgres_db="nextjs_blank_template_dev"
    default_postgres_user="nextjs_blank_template"
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

if [[ ! -f "${env_file}" ]]; then
  echo "Missing env file: ${env_file}" >&2
  exit 1
fi

ensure_default_env() {
  local key="$1"
  local value="$2"

  if [[ -n "${!key:-}" ]]; then
    return
  fi

  if grep -qE "^${key}[[:space:]]*=" "${env_file}"; then
    return
  fi

  export "${key}=${value}"
}

ensure_default_env APP_PORT "${default_app_port}"
ensure_default_env POSTGRES_DB "${default_postgres_db}"
ensure_default_env POSTGRES_USER "${default_postgres_user}"

if [[ -z "${POSTGRES_PASSWORD:-}" ]] &&
  ! grep -qE "^POSTGRES_PASSWORD[[:space:]]*=" "${env_file}"; then
  echo "POSTGRES_PASSWORD is required in ${env_file} for docker-compose.prod.yml." >&2
  exit 1
fi

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
