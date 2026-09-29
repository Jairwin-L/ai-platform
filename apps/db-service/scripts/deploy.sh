#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  SERVICE_IMAGE=<image> PRISMA_TOOL_IMAGE=<image> apps/db-service/scripts/deploy.sh <production|development>
  apps/db-service/scripts/deploy.sh <production|development> <service image>

部署 db-service 栈：postgres / redis / db-service，以及 Prisma migrate deploy、种子数据与超级管理员。
platform 栈不碰数据库，只通过共享网络连过来。

Required environment variables:
  SERVICE_IMAGE          db-service（NestJS）镜像。也可作为第二个参数传入。
  POSTGRES_PASSWORD      数据库密码。只在数据卷首次初始化时生效，之后修改需先 ALTER ROLE 再同步 secret。

Optional environment variables:
  PRISMA_TOOL_IMAGE      Prisma 工具镜像。默认按 <repo>:service-<sha> 推导为 <repo>:prisma-<sha>。
  DEPLOY_ENV_FILE        env 文件。默认 .env.production / .env.development。
  COMPOSE_PROJECT_NAME   Compose project。默认 ai-platform-prod / ai-platform-dev。
  COMPOSE_FILE           冒号分隔的 compose 文件列表，覆盖默认值。
  SHARED_NETWORK         与 platform 栈共享的 Docker 网络名。默认 ai-platform-prod-net / ai-platform-dev-net。
  POSTGRES_DB            数据库名。默认 ai_platform（prod）/ ai_platform_dev（dev）。
  POSTGRES_USER          数据库账号。默认 ai_platform。
  DATABASE_URL           默认由上面三个 POSTGRES_* 推导，改账号密码时不必再单独配一份。
  REDIS_URL              默认 redis://redis:6379/0（共享网络内的 redis 服务）。
  POSTGRES_IMAGE         PostgreSQL 镜像。默认 postgres:18-alpine。
  POSTGRES_DATA_TARGET   PostgreSQL 卷挂载点。默认 /var/lib/postgresql。
  POSTGRES_DATA_VOLUME   PostgreSQL 数据卷名。默认 <project>_postgres-data，不要随意改。
  REDIS_DATA_VOLUME      Redis 数据卷名。默认 <project>_redis-data。
  SKIP_PRISMA_MIGRATE    设为 "true" 跳过 prisma migrate deploy。
  SKIP_SEED              设为 "true" 跳过种子数据与超级管理员初始化。
  FORCE_MENU_SEED        设为 "true" 以 prisma/data/menu 为准重新同步菜单 / 按钮资源；
                         库里多出来的菜单（含后台手动新增的）连同其角色关联会被删除。
  FORCE_ROLE_SEED        设为 "true" 以 prisma/data/role 为准重置种子角色，后台新建的角色保留。
                         新增权限码时需同时开启 FORCE_MENU_SEED。
  BOOTSTRAP_ADMIN_ACCOUNT / BOOTSTRAP_ADMIN_PASSWORD
                         同时配置时确保该超级管理员系统账号存在；已存在的账号不会被重置密码。
  BOOTSTRAP_ADMIN_RESET_PASSWORD
                         设为 "true" 时把已存在账号的密码重置为 BOOTSTRAP_ADMIN_PASSWORD（一次性找回用）。
  PRISMA_MIGRATE_COMMAND 覆盖 migrate 命令。默认 vp run prisma:deploy。
  PRISMA_SEED_COMMAND    覆盖种子命令。默认 vp run prisma:seed:deploy。
  BOOTSTRAP_ADMIN_COMMAND
                         覆盖超级管理员命令。默认 vp run prisma:bootstrap-admin:deploy。
  DOCKER_PRUNE_UNTIL     兜底 prune 的时间过滤。默认 24h。
  DOCKER_PRUNE_THRESHOLD 触发全局兜底 prune 的磁盘占用百分比。默认 80。
  DOCKER_PRUNE_ALL       设为 "true" 时总是执行全局兜底 prune。
  SKIP_DOCKER_PRUNE      设为 "true" 跳过所有 Docker 磁盘回收。
  KEEP_PRISMA_TOOL_IMAGE 设为 "true" 时部署结束后保留 Prisma 工具镜像。

Examples:
  SERVICE_IMAGE=ghcr.io/<owner>/<repo>:service-<sha> \
  PRISMA_TOOL_IMAGE=ghcr.io/<owner>/<repo>:prisma-<sha> \
    apps/db-service/scripts/deploy.sh production
EOF
}

environment="${1:-}"
image="${SERVICE_IMAGE:-${2:-}}"

if [[ -z "${environment}" || "${environment}" == "-h" || "${environment}" == "--help" ]]; then
  usage
  exit 0
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stack_dir="$(dirname "${script_dir}")"

case "${environment}" in
  production | prod | main)
    default_env_file=".env.production"
    default_project_name="ai-platform-prod"
    default_service_port="8072"
    default_postgres_db="ai_platform"
    default_postgres_user="ai_platform"
    default_compose_files=("${stack_dir}/docker-compose.yml")
    default_shared_network="ai-platform-prod-net"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="ai-platform-dev"
    default_service_port="8070"
    default_postgres_db="ai_platform_dev"
    default_postgres_user="ai_platform"
    default_compose_files=("${stack_dir}/docker-compose.yml" "${stack_dir}/docker-compose.dev.yml")
    default_postgres_bind_address="0.0.0.0"
    default_postgres_port="5433"
    default_redis_bind_address="0.0.0.0"
    default_redis_port="6380"
    default_shared_network="ai-platform-dev-net"
    ;;
  *)
    echo "Unknown environment: ${environment}" >&2
    usage
    exit 1
    ;;
esac

if [[ -z "${image}" ]]; then
  echo "SERVICE_IMAGE is required. Pass it as an environment variable or second argument." >&2
  usage
  exit 1
fi

if [[ -n "${COMPOSE_FILE:-}" ]]; then
  IFS=':' read -r -a compose_files <<< "${COMPOSE_FILE}"
else
  compose_files=("${default_compose_files[@]}")
fi

compose_service="${COMPOSE_SERVICE:-db-service}"
env_file="${DEPLOY_ENV_FILE:-${default_env_file}}"
project_name="${COMPOSE_PROJECT_NAME:-${default_project_name}}"

# 卷名由 project 推导；改了 COMPOSE_PROJECT_NAME 却不迁移旧卷，等同于挂上一个全新的空库。
default_postgres_data_volume="${project_name}_postgres-data"
default_redis_data_volume="${project_name}_redis-data"
prisma_migrate_command="${PRISMA_MIGRATE_COMMAND:-vp run prisma:deploy}"
prisma_seed_command="${PRISMA_SEED_COMMAND:-vp run prisma:seed:deploy}"
bootstrap_admin_command="${BOOTSTRAP_ADMIN_COMMAND:-vp run prisma:bootstrap-admin:deploy}"

compose_args=()
for compose_file in "${compose_files[@]}"; do
  if [[ ! -f "${compose_file}" ]]; then
    echo "Missing compose file: ${compose_file}" >&2
    exit 1
  fi

  compose_args+=(-f "${compose_file}")
done

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

read_env_value() {
  local key="$1"
  local value

  value="$(grep -E "^${key}[[:space:]]*=" "${env_file}" | tail -n 1 | sed -E "s/^${key}[[:space:]]*=[[:space:]]*//")"
  value="${value%$'\r'}"

  if [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

runtime_env_value() {
  local key="$1"
  local fallback="$2"

  if [[ -n "${!key:-}" ]]; then
    printf '%s' "${!key}"
    return
  fi

  if grep -qE "^${key}[[:space:]]*=" "${env_file}"; then
    local env_value

    env_value="$(read_env_value "${key}")"
    if [[ -n "${env_value}" ]]; then
      printf '%s' "${env_value}"
      return
    fi

    printf '%s' "${fallback}"
    return
  fi

  printf '%s' "${fallback}"
}

# 密码里可能出现 @ : / # 等字符，直接拼进连接串会破坏 URL 结构。
url_encode() {
  local raw="$1"
  local out=""
  local index
  local char

  for (( index = 0; index < ${#raw}; index++ )); do
    char="${raw:index:1}"
    case "${char}" in
      [a-zA-Z0-9._~-]) out+="${char}" ;;
      *) out+="$(printf '%%%02X' "'${char}")" ;;
    esac
  done

  printf '%s' "${out}"
}

# 公开仓库里不放数据库默认密码：dev 环境的 postgres 端口对外暴露，弱口令等于裸奔。
runtime_postgres_password="$(runtime_env_value POSTGRES_PASSWORD "")"
if [[ -z "${runtime_postgres_password}" ]]; then
  echo "POSTGRES_PASSWORD is required in ${env_file} or the environment." >&2
  exit 1
fi

ensure_default_env POSTGRES_DB "${default_postgres_db}"
ensure_default_env POSTGRES_USER "${default_postgres_user}"

runtime_postgres_db="$(runtime_env_value POSTGRES_DB "${default_postgres_db}")"
runtime_postgres_user="$(runtime_env_value POSTGRES_USER "${default_postgres_user}")"

# DATABASE_URL 默认值由 POSTGRES_* 推导，避免改了库名/密码却忘了同步连接串。
default_database_url="postgresql://$(url_encode "${runtime_postgres_user}"):$(url_encode "${runtime_postgres_password}")@postgres:5432/${runtime_postgres_db}?schema=public"

ensure_default_env DATABASE_URL "${default_database_url}"
ensure_default_env REDIS_URL "redis://redis:6379/0"
if [[ -n "${default_postgres_bind_address:-}" ]]; then
  ensure_default_env POSTGRES_BIND_ADDRESS "${default_postgres_bind_address}"
fi
if [[ -n "${default_postgres_port:-}" ]]; then
  ensure_default_env POSTGRES_PORT "${default_postgres_port}"
fi
if [[ -n "${default_redis_bind_address:-}" ]]; then
  ensure_default_env REDIS_BIND_ADDRESS "${default_redis_bind_address}"
fi
if [[ -n "${default_redis_port:-}" ]]; then
  ensure_default_env REDIS_PORT "${default_redis_port}"
fi

runtime_database_url="$(runtime_env_value DATABASE_URL "${default_database_url}")"
runtime_postgres_image="$(runtime_env_value POSTGRES_IMAGE "postgres:18-alpine")"
runtime_postgres_data_target="$(runtime_env_value POSTGRES_DATA_TARGET "/var/lib/postgresql")"
runtime_postgres_data_volume="$(runtime_env_value POSTGRES_DATA_VOLUME "${default_postgres_data_volume}")"
runtime_redis_data_volume="$(runtime_env_value REDIS_DATA_VOLUME "${default_redis_data_volume}")"
runtime_shared_network="$(runtime_env_value SHARED_NETWORK "${default_shared_network}")"
runtime_skip_prisma_migrate="$(runtime_env_value SKIP_PRISMA_MIGRATE "false")"
runtime_skip_seed="$(runtime_env_value SKIP_SEED "false")"
runtime_force_menu_seed="$(runtime_env_value FORCE_MENU_SEED "false")"
runtime_force_role_seed="$(runtime_env_value FORCE_ROLE_SEED "false")"
runtime_bootstrap_admin_account="$(runtime_env_value BOOTSTRAP_ADMIN_ACCOUNT "")"
runtime_bootstrap_admin_password="$(runtime_env_value BOOTSTRAP_ADMIN_PASSWORD "")"
runtime_bootstrap_admin_reset_password="$(runtime_env_value BOOTSTRAP_ADMIN_RESET_PASSWORD "false")"

# 镜像引用可能是 repo:tag、repo@sha256:...，也可能带私有仓库端口（host:5000/repo），
# 因此只在最后一段里剥离 tag。
image_repository() {
  local ref="${1%%@*}"

  if [[ "${ref##*/}" == *:* ]]; then
    ref="${ref%:*}"
  fi

  printf '%s' "${ref}"
}

image_tag() {
  local ref="${1%%@*}"

  if [[ "${ref##*/}" == *:* ]]; then
    printf '%s' "${ref##*:}"
    return
  fi

  printf 'latest'
}

# prisma 工具镜像和 service 镜像同仓库不同前缀：<repo>:service-<sha> / <repo>:prisma-<sha>
runtime_prisma_tool_image="$(
  runtime_env_value PRISMA_TOOL_IMAGE \
    "$(printf '%s:prisma-%s' "$(image_repository "${image}")" "$(image_tag "${image}" | sed -E 's/^service-//')")"
)"

uses_compose_postgres=false
if [[ "${runtime_database_url}" == *"@postgres:"* || "${runtime_database_url}" == *"@postgres/"* ]]; then
  uses_compose_postgres=true
fi

require_env_keys=(
  AUTH_CODE_SECRET
  AI_KEY_ENCRYPTION_KEY_V1
  AI_KEY_REDIS_ID_SECRET
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_ENDPOINT_URL
  R2_BUCKET_NAME
)

missing_env_keys=()
for key in "${require_env_keys[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    if ! grep -qE "^${key}[[:space:]]*=[^[:space:]]+" "${env_file}"; then
      missing_env_keys+=("${key}")
    fi
  fi
done

if (( ${#missing_env_keys[@]} > 0 )); then
  echo "Missing required runtime environment variables in ${env_file}: ${missing_env_keys[*]}" >&2
  echo "Add them to GitHub Environment secrets/vars or the server env file before deploying." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required." >&2
  exit 1
fi

validate_docker_volume_name() {
  local key="$1"
  local value="$2"

  if [[ ! "${value}" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]; then
    echo "${key} must be a Docker volume name, got: ${value}" >&2
    echo "Do not use image tags such as postgres:18-alpine." >&2
    exit 1
  fi
}

validate_docker_volume_name POSTGRES_DATA_VOLUME "${runtime_postgres_data_volume}"
validate_docker_volume_name REDIS_DATA_VOLUME "${runtime_redis_data_volume}"

echo "Deploying db-service (${environment})"
echo "  service image:  ${image}"
echo "  prisma image:   ${runtime_prisma_tool_image}"
echo "  project:        ${project_name}"
echo "  env:            ${env_file}"
echo "  compose:        ${compose_files[*]}"
echo "  network:        ${runtime_shared_network}"
echo "  postgres image: ${runtime_postgres_image}"
echo "  postgres volume:${runtime_postgres_data_volume}"
echo "  redis volume:   ${runtime_redis_data_volume}"

docker_prune_until="${DOCKER_PRUNE_UNTIL:-24h}"
docker_prune_threshold="${DOCKER_PRUNE_THRESHOLD:-80}"
docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
docker_root="${docker_root:-/var/lib/docker}"

# docker_root 在旧版 Docker 或非常规安装下可能不存在，回退到根分区；
# 同时吞掉失败，避免 pipefail 让磁盘统计中断整个部署。
disk_target() {
  if [[ -d "${docker_root}" ]]; then
    printf '%s' "${docker_root}"
  else
    printf '/'
  fi
}

report_disk_usage() {
  df -h "$(disk_target)" 2>/dev/null || true
}

disk_used_percent() {
  df -P "$(disk_target)" 2>/dev/null | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }' || true
}

# 每次部署都推送新的 SHA tag，旧 tag 不是 dangling，`docker image prune -f` 清不掉。
# platform 和 db-service 共用同一个 GHCR 仓库，只是 tag 前缀不同，
# 所以这里只清理 service-* / prisma-* 前缀，别误删 platform 的镜像。
prune_stale_repo_images() {
  if [[ "${SKIP_DOCKER_PRUNE:-false}" == "true" ]]; then
    return 0
  fi

  local repo
  repo="$(image_repository "${image}")"

  # 只保留本次部署的镜像；CI 不推可变 latest tag。prisma 工具镜像在部署结束后
  # 由 prune_prisma_tool_image 一并删掉，服务器稳态只留 db-service 运行镜像。
  local keep=(
    "${image}"
    "${runtime_prisma_tool_image}"
  )
  local tag

  echo "Removing superseded db-service images for ${repo}"
  while IFS= read -r tag; do
    if [[ -z "${tag}" || "${tag}" == *":<none>" ]]; then
      continue
    fi

    local tag_suffix="${tag##*:}"
    if [[ "${tag_suffix}" != service-* && "${tag_suffix}" != prisma-* ]]; then
      continue
    fi

    local keeper
    local skip=false
    for keeper in "${keep[@]}"; do
      if [[ "${tag}" == "${keeper}" ]]; then
        skip=true
        break
      fi
    done

    if [[ "${skip}" == "true" ]]; then
      continue
    fi

    # 仍被容器引用的镜像会删除失败，这里忽略即可。
    docker rmi "${tag}" >/dev/null 2>&1 && echo "  removed ${tag}" || true
  done < <(docker images --format '{{.Repository}}:{{.Tag}}' --filter "reference=${repo}" || true)
}

# Prisma 工具镜像只在部署过程中使用，体积却和构建依赖一样大。
# 部署结束后删掉它，服务器稳态只保留 db-service 运行镜像。
prune_prisma_tool_image() {
  if [[ "${SKIP_DOCKER_PRUNE:-false}" == "true" || "${KEEP_PRISMA_TOOL_IMAGE:-false}" == "true" ]]; then
    return 0
  fi

  if [[ -z "${runtime_prisma_tool_image}" ]]; then
    return 0
  fi

  docker rmi "${runtime_prisma_tool_image}" >/dev/null 2>&1 \
    && echo "  removed ${runtime_prisma_tool_image}" || true
}

# 默认只回收本项目产生的垃圾；只有磁盘确实吃紧时，才动这台机器上
# 其他项目遗留的未使用镜像，避免共用服务器被误伤。
reclaim_disk_space() {
  local label="$1"

  if [[ "${SKIP_DOCKER_PRUNE:-false}" == "true" ]]; then
    echo "Skipping Docker disk reclamation (${label}) because SKIP_DOCKER_PRUNE is true."
    return 0
  fi

  echo "Reclaiming Docker disk space (${label})"
  docker container prune -f || true
  docker image prune -f || true

  local used=""
  used="$(disk_used_percent)" || true

  if [[ "${DOCKER_PRUNE_ALL:-false}" == "true" ]] ||
    { [[ "${used}" =~ ^[0-9]+$ ]] && ((used >= docker_prune_threshold)); }; then
    echo "Disk usage at ${used:-unknown}% (threshold ${docker_prune_threshold}%); pruning unused images older than ${docker_prune_until}"
    docker image prune -af --filter "until=${docker_prune_until}" || true
    docker builder prune -f --filter "until=${docker_prune_until}" || true
  else
    docker builder prune -f --filter "until=${docker_prune_until}" || true
  fi

  report_disk_usage
}

compose() {
  COMPOSE_PROJECT_NAME="${project_name}" \
    SERVICE_IMAGE="${image}" \
    PRISMA_TOOL_IMAGE="${runtime_prisma_tool_image}" \
    POSTGRES_IMAGE="${runtime_postgres_image}" \
    POSTGRES_DATA_TARGET="${runtime_postgres_data_target}" \
    POSTGRES_DATA_VOLUME="${runtime_postgres_data_volume}" \
    REDIS_DATA_VOLUME="${runtime_redis_data_volume}" \
    SHARED_NETWORK="${runtime_shared_network}" \
    SERVICE_PORT="${default_service_port}" \
    docker compose --env-file "${env_file}" "${compose_args[@]}" "$@"
}

wait_for_compose_postgres() {
  local container
  local attempt

  container="$(compose ps -q postgres)"
  if [[ -z "${container}" ]]; then
    echo "PostgreSQL container was not created." >&2
    compose ps >&2 || true
    return 1
  fi

  for attempt in $(seq 1 60); do
    if docker exec "${container}" pg_isready -U "${runtime_postgres_user}" -d "${runtime_postgres_db}" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "PostgreSQL did not become ready" >&2
  docker logs --tail 80 "${container}" >&2 || true
  return 1
}

prune_stale_repo_images
reclaim_disk_space "before pull"

compose pull "${compose_service}"

compose up -d postgres redis
if [[ "${uses_compose_postgres}" == "true" ]]; then
  wait_for_compose_postgres
fi

echo "Pulling Prisma tool image"
compose --profile tools pull migrate

if [[ "${uses_compose_postgres}" == "true" ]]; then
  echo "Ensuring PostgreSQL database exists: ${runtime_postgres_db}"
  if ! compose exec -T postgres psql -U "${runtime_postgres_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${runtime_postgres_db}'" | grep -q 1; then
    compose exec -T postgres psql -U "${runtime_postgres_user}" -d postgres -c "CREATE DATABASE \"${runtime_postgres_db}\" OWNER \"${runtime_postgres_user}\";"
  fi
else
  echo "Skipping compose PostgreSQL database creation because DATABASE_URL does not target the compose postgres service."
fi

# DATABASE_URL 由 compose 按 env 文件插值进 migrate 服务，不在命令行上传值，避免密码出现在 ps 里。
if [[ "${runtime_skip_prisma_migrate}" == "true" ]]; then
  echo "Skipping Prisma migrate deploy because SKIP_PRISMA_MIGRATE is true."
else
  echo "Running Prisma migrate deploy"
  compose --profile tools run --rm migrate sh -lc "${prisma_migrate_command}"
fi

# 种子每次部署都跑：菜单 / 角色只在 RBAC 未初始化或 FORCE_* 开启时写入（见 prisma/data/rbac.ts），
# AI Provider 与第三方服务选项按种子值同步；随后按 BOOTSTRAP_ADMIN_* 确保超级管理员存在（两者都空时跳过）。
# -e 只传变量名、值从当前进程环境继承：密码不会出现在 docker 命令行参数里。
if [[ "${runtime_skip_seed}" == "true" ]]; then
  echo "Skipping seed data because SKIP_SEED is true."
else
  if [[ "${runtime_force_menu_seed}" == "true" ]]; then
    echo "Refreshing menu data (FORCE_MENU_SEED)"
  fi
  if [[ "${runtime_force_role_seed}" == "true" ]]; then
    echo "Refreshing role data (FORCE_ROLE_SEED)"
  fi

  FORCE_MENU_SEED="${runtime_force_menu_seed}" \
    FORCE_ROLE_SEED="${runtime_force_role_seed}" \
    BOOTSTRAP_ADMIN_ACCOUNT="${runtime_bootstrap_admin_account}" \
    BOOTSTRAP_ADMIN_PASSWORD="${runtime_bootstrap_admin_password}" \
    BOOTSTRAP_ADMIN_RESET_PASSWORD="${runtime_bootstrap_admin_reset_password}" \
    compose --profile tools run --rm \
    -e FORCE_MENU_SEED \
    -e FORCE_ROLE_SEED \
    -e BOOTSTRAP_ADMIN_ACCOUNT \
    -e BOOTSTRAP_ADMIN_PASSWORD \
    -e BOOTSTRAP_ADMIN_RESET_PASSWORD \
    migrate sh -lc "${prisma_seed_command} && ${bootstrap_admin_command}"
fi

compose up -d --no-build "${compose_service}"

prune_stale_repo_images
prune_prisma_tool_image
reclaim_disk_space "after deploy"
