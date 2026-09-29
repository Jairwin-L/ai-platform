#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  APP_IMAGE=<image> apps/platform/scripts/deploy.sh <production|development>
  apps/platform/scripts/deploy.sh <production|development> <image>

只部署 platform（Next.js）容器。postgres / redis / db-service / Prisma 全部由 db-service 栈负责，
这里只把 app 接入 db-service 创建的共享网络 ${SHARED_NETWORK}。
首次部署必须先跑 apps/db-service/scripts/deploy.sh，否则共享网络里没有接口服务。

Optional environment variables:
  DEPLOY_ENV_FILE        env 文件。默认 .env.production / .env.development。
  COMPOSE_PROJECT_NAME   Compose project。默认 ai-platform-app-prod / ai-platform-app-dev。
  COMPOSE_FILE           冒号分隔的 compose 文件列表，覆盖默认值。
  SHARED_NETWORK         与 db-service 栈共享的 Docker 网络名。默认 ai-platform-prod-net / ai-platform-dev-net。
  API_INTERNAL_ORIGIN    SSR 直连 db-service 的地址。默认 http://db-service:8072（prod）/ http://db-service:8070（dev）。
  DOCKER_PRUNE_UNTIL     兜底 prune 的时间过滤。默认 24h。
  DOCKER_PRUNE_THRESHOLD 触发全局兜底 prune 的磁盘占用百分比。默认 80。
  DOCKER_PRUNE_ALL       设为 "true" 时总是执行全局兜底 prune。
  SKIP_DOCKER_PRUNE      设为 "true" 跳过所有 Docker 磁盘回收。

Examples:
  APP_IMAGE=ghcr.io/<owner>/<repo>:front-end-<sha> apps/platform/scripts/deploy.sh production
EOF
}

environment="${1:-}"
image="${APP_IMAGE:-${2:-}}"

if [[ -z "${environment}" || "${environment}" == "-h" || "${environment}" == "--help" ]]; then
  usage
  exit 0
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stack_dir="$(dirname "${script_dir}")"

case "${environment}" in
  production | prod | main)
    default_env_file=".env.production"
    default_project_name="ai-platform-app-prod"
    default_app_port="8062"
    default_shared_network="ai-platform-prod-net"
    default_api_internal_origin="http://db-service:8072"
    ;;
  development | dev)
    default_env_file=".env.development"
    default_project_name="ai-platform-app-dev"
    default_app_port="8060"
    default_shared_network="ai-platform-dev-net"
    default_api_internal_origin="http://db-service:8070"
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

if [[ -n "${COMPOSE_FILE:-}" ]]; then
  IFS=':' read -r -a compose_files <<< "${COMPOSE_FILE}"
else
  compose_files=("${stack_dir}/docker-compose.yml")
fi

compose_service="${COMPOSE_SERVICE:-app}"
env_file="${DEPLOY_ENV_FILE:-${default_env_file}}"
project_name="${COMPOSE_PROJECT_NAME:-${default_project_name}}"

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

  if grep -qE "^${key}[[:space:]]*=[^[:space:]]+" "${env_file}"; then
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

runtime_shared_network="$(runtime_env_value SHARED_NETWORK "${default_shared_network}")"

# SSR 取数只读这个变量；端口必须与 db-service 栈的 SERVICE_PORT 对齐，
# 且应与构建镜像时的 build-arg 一致（rewrites 转发目标已烘进镜像）。
ensure_default_env API_INTERNAL_ORIGIN "${default_api_internal_origin}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required." >&2
  exit 1
fi

# 网络由 db-service 栈创建；platform 早于 db-service 部署时先建出来，
# 避免 external network 不存在导致 compose 直接失败。
ensure_shared_network() {
  if docker network inspect "${runtime_shared_network}" >/dev/null 2>&1; then
    return 0
  fi

  echo "Shared network ${runtime_shared_network} does not exist yet; creating it."
  echo "注意：db-service 栈还没部署，platform 连不上接口服务，请随后部署 db-service。"
  docker network create "${runtime_shared_network}" >/dev/null
}

echo "Deploying platform (${environment})"
echo "  image:   ${image}"
echo "  project: ${project_name}"
echo "  env:     ${env_file}"
echo "  compose: ${compose_files[*]}"
echo "  network: ${runtime_shared_network}"

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

# 镜像引用可能是 repo:tag、repo@sha256:...，也可能带私有仓库端口（host:5000/repo），
# 因此只在最后一段里剥离 tag。
image_repository() {
  local ref="${1%%@*}"

  if [[ "${ref##*/}" == *:* ]]; then
    ref="${ref%:*}"
  fi

  printf '%s' "${ref}"
}

# 每次部署都推送新的 SHA tag，旧 tag 不是 dangling，`docker image prune -f` 清不掉。
# platform（front-end-*）和 db-service（service-* / prisma-*）共用同一个 GHCR 仓库，只是 tag 前缀不同，
# 所以这里跳过 service-* / prisma-* 前缀，别误删 db-service 的镜像；无前缀的旧版 <sha> tag 也会一并清掉。
prune_stale_repo_images() {
  if [[ "${SKIP_DOCKER_PRUNE:-false}" == "true" ]]; then
    return 0
  fi

  local repo
  repo="$(image_repository "${image}")"

  # 只保留本次部署的镜像；CI 不推可变 latest tag，服务器稳态就是每栈一份镜像。
  local keep=(
    "${image}"
  )
  local tag

  echo "Removing superseded platform images for ${repo}"
  while IFS= read -r tag; do
    if [[ -z "${tag}" || "${tag}" == *":<none>" ]]; then
      continue
    fi

    local tag_suffix="${tag##*:}"
    if [[ "${tag_suffix}" == service-* || "${tag_suffix}" == prisma-* ]]; then
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
    APP_IMAGE="${image}" \
    SHARED_NETWORK="${runtime_shared_network}" \
    APP_PORT="${default_app_port}" \
    docker compose --env-file "${env_file}" "${compose_args[@]}" "$@"
}

ensure_shared_network

prune_stale_repo_images
reclaim_disk_space "before pull"

compose pull "${compose_service}"
compose up -d --no-build "${compose_service}"

prune_stale_repo_images
reclaim_disk_space "after deploy"
