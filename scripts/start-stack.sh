#!/usr/bin/env bash
# =============================================================================
# start-stack.sh — Start the XPS Shadow Scraper full-stack (Docker Compose)
#
# Usage:
#   bash scripts/start-stack.sh [--full] [--build] [--down] [--logs]
#
# Flags:
#   --full   Use docker-compose.full-stack.yml (includes template services)
#   --build  Force rebuild of Docker images
#   --down   Tear down running services (docker compose down -v)
#   --logs   Tail logs after startup
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[stack]${RESET} $*"; }
success() { echo -e "${GREEN}[stack]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[stack]${RESET} $*"; }
error()   { echo -e "${RED}[stack]${RESET} $*" >&2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FULL=false
BUILD_FLAG=""
DOWN=false
LOGS=false

for arg in "$@"; do
  case "$arg" in
    --full)  FULL=true ;;
    --build) BUILD_FLAG="--build" ;;
    --down)  DOWN=true ;;
    --logs)  LOGS=true ;;
  esac
done

# ─── Select compose file ──────────────────────────────────────────────────────
if [[ "$FULL" == "true" ]]; then
  COMPOSE_FILE="${REPO_ROOT}/docker-compose.full-stack.yml"
  info "Using full-stack compose file (all templates)"
else
  COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"
  info "Using core compose file (backend + frontend + DB + cache)"
fi

# ─── Tear down if requested ───────────────────────────────────────────────────
if [[ "$DOWN" == "true" ]]; then
  info "Tearing down services..."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
  success "Services stopped and volumes removed"
  exit 0
fi

# ─── Verify .env exists ───────────────────────────────────────────────────────
if [[ ! -f "${REPO_ROOT}/.env" ]]; then
  warn ".env not found — running setup-integration.sh first..."
  bash "${REPO_ROOT}/scripts/setup-integration.sh" --skip-install
fi

# ─── Pull images ─────────────────────────────────────────────────────────────
info "Pulling latest base images..."
docker compose -f "$COMPOSE_FILE" pull --quiet 2>/dev/null || warn "Some images couldn't be pulled — continuing with cached versions"

# ─── Start services ───────────────────────────────────────────────────────────
info "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG --remove-orphans

# ─── Wait for core health checks ─────────────────────────────────────────────
info "Waiting for services to be healthy..."

wait_healthy() {
  local name="$1" url="$2" max_attempts="${3:-30}"
  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    if curl -sf "$url" &>/dev/null; then
      success "${name} is healthy"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  warn "${name} did not become healthy within $((max_attempts * 2))s — check logs"
  return 1
}

wait_healthy "Backend"  "http://localhost:3001/health" 30 || true
wait_healthy "Frontend" "http://localhost:3000"        20 || true

# ─── Print status ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  XPS Integration Stack — Running${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${RESET}"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "  ${CYAN}Frontend:${RESET}  http://localhost:3000"
echo -e "  ${CYAN}Backend:${RESET}   http://localhost:3001"
echo -e "  ${CYAN}n8n:${RESET}       http://localhost:5678"
echo ""

# ─── Tail logs if requested ──────────────────────────────────────────────────
if [[ "$LOGS" == "true" ]]; then
  docker compose -f "$COMPOSE_FILE" logs -f --tail=50
fi
