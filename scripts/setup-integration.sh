#!/usr/bin/env bash
# =============================================================================
# setup-integration.sh — XPS Shadow Scraper Full-Stack Integration Setup
#
# Purpose:
#   1. Clone all required open-source template repositories
#   2. Install dependencies for each template
#   3. Generate a merged .env from .env.example (if .env does not exist)
#   4. Validate that required tools are available
#
# Usage:
#   bash scripts/setup-integration.sh [--skip-install] [--templates-only]
#
# Requirements:
#   git, node (>=20), npm, docker, docker compose v2
# =============================================================================

set -euo pipefail

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[setup]${RESET} $*"; }
success() { echo -e "${GREEN}[setup]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[setup]${RESET} $*"; }
error()   { echo -e "${RED}[setup]${RESET} $*" >&2; }

# ─── Options ──────────────────────────────────────────────────────────────────
SKIP_INSTALL=false
TEMPLATES_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --skip-install)   SKIP_INSTALL=true ;;
    --templates-only) TEMPLATES_ONLY=true ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="${REPO_ROOT}/templates"

# ─── Prerequisite check ───────────────────────────────────────────────────────
check_prereqs() {
  info "Checking prerequisites..."
  local missing=()
  for cmd in git node npm docker; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done

  # docker compose v2
  if ! docker compose version &>/dev/null 2>&1; then
    missing+=("docker-compose-v2")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing required tools: ${missing[*]}"
    error "Install them before running this script."
    exit 1
  fi

  local node_major
  node_major=$(node --version | sed 's/v//' | cut -d. -f1)
  if [[ "$node_major" -lt 20 ]]; then
    error "Node.js >= 20 required (found $(node --version))"
    exit 1
  fi

  success "All prerequisites satisfied (node $(node --version), npm $(npm --version))"
}

# ─── Template repository definitions ──────────────────────────────────────────
# Format: "NAME|GIT_URL|BRANCH"
TEMPLATES=(
  "firecrawl|https://github.com/mendableai/firecrawl.git|main"
  "firecrawl-mcp|https://github.com/mendableai/mcp-server-firecrawl.git|main"
  "open-lovable|https://github.com/mendableai/open-lovable.git|main"
  "open-agent-builder|https://github.com/mendableai/open-agent-builder.git|main"
  "open-claw|https://github.com/mendableai/open-claw.git|main"
  "open-deep-research|https://github.com/mendableai/open-deep-research.git|main"
)

# ─── Clone / update a single template ────────────────────────────────────────
clone_template() {
  local name="$1" url="$2" branch="$3"
  local dest="${TEMPLATES_DIR}/${name}"

  if [[ -d "${dest}/.git" ]]; then
    info "Updating ${name} (already cloned)..."
    git -C "$dest" fetch origin --quiet
    git -C "$dest" reset --hard "origin/${branch}" --quiet 2>/dev/null || \
      git -C "$dest" checkout "$branch" --quiet 2>/dev/null || true
    success "Updated ${name}"
  else
    info "Cloning ${name} from ${url} (branch: ${branch})..."
    if git clone --depth 1 --branch "$branch" "$url" "$dest" --quiet 2>/dev/null; then
      success "Cloned ${name}"
    else
      # Fallback: clone default branch
      warn "Branch '${branch}' not found for ${name}, cloning default branch..."
      if git clone --depth 1 "$url" "$dest" --quiet 2>/dev/null; then
        success "Cloned ${name} (default branch)"
      else
        warn "Could not clone ${name} — skipping (network or access issue)"
        # Create stub directory so docker-compose builds don't fail
        mkdir -p "${dest}"
        echo "# Stub — run setup-integration.sh with network access to clone ${url}" > "${dest}/README.md"
      fi
    fi
  fi
}

# ─── Install dependencies for a template ─────────────────────────────────────
install_template_deps() {
  local name="$1"
  local dest="${TEMPLATES_DIR}/${name}"

  if [[ ! -f "${dest}/package.json" ]]; then
    warn "No package.json in ${name} — skipping npm install"
    return
  fi

  info "Installing dependencies for ${name}..."
  (cd "$dest" && npm install --legacy-peer-deps --quiet 2>/dev/null) || \
    warn "npm install failed for ${name} — continuing"
  success "Dependencies installed for ${name}"
}

# ─── Generate .env from .env.example ─────────────────────────────────────────
generate_env() {
  if [[ -f "${REPO_ROOT}/.env" ]]; then
    info ".env already exists — skipping generation"
    return
  fi

  info "Generating .env from .env.example..."
  cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"

  # Inject placeholder values that are clearly marked (portable sed, works on Linux + macOS)
  perl -i -pe 's/^GROQ_API_KEY=$/GROQ_API_KEY=gsk_REPLACE_ME/' "${REPO_ROOT}/.env" 2>/dev/null || true
  perl -i -pe 's/^FIRECRAWL_API_KEY=$/FIRECRAWL_API_KEY=fc-REPLACE_ME/' "${REPO_ROOT}/.env" 2>/dev/null || true

  success ".env created — please edit it and fill in your secrets before starting the stack"
  warn "  → Edit ${REPO_ROOT}/.env"
}

# ─── Write env files for each template ───────────────────────────────────────
write_template_envs() {
  info "Writing .env stubs for templates..."

  # open-deep-research
  local dr_dir="${TEMPLATES_DIR}/open-deep-research"
  if [[ -d "$dr_dir" && ! -f "${dr_dir}/.env" ]]; then
    cat > "${dr_dir}/.env" <<'EOF'
# Open Deep Research — env stub generated by setup-integration.sh
# Fill in real values before starting services
OPENAI_API_KEY=${OPENAI_API_KEY:-}
GROQ_API_KEY=${GROQ_API_KEY:-}
FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY:-}
PORT=3004
EOF
  fi

  # open-claw
  local claw_dir="${TEMPLATES_DIR}/open-claw"
  if [[ -d "$claw_dir" && ! -f "${claw_dir}/.env" ]]; then
    cat > "${claw_dir}/.env" <<'EOF'
# Open Claw — env stub generated by setup-integration.sh
PORT=3003
FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY:-}
DATABASE_URL=${DATABASE_URL:-}
REDIS_URL=${REDIS_URL:-}
EOF
  fi

  # open-lovable
  local lovable_dir="${TEMPLATES_DIR}/open-lovable"
  if [[ -d "$lovable_dir" && ! -f "${lovable_dir}/.env" ]]; then
    cat > "${lovable_dir}/.env" <<'EOF'
# Open Lovable — env stub generated by setup-integration.sh
VITE_API_URL=http://localhost:3001/api
VITE_FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY:-}
EOF
  fi

  success "Template .env stubs written"
}

# ─── Print summary ────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
  echo -e "${GREEN}${BOLD}  XPS Integration Stack — Setup Complete${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
  echo ""
  echo -e "  ${CYAN}Templates cloned to:${RESET}  ${TEMPLATES_DIR}/"
  echo ""
  echo -e "  ${CYAN}Next steps:${RESET}"
  echo -e "    1. Edit ${BOLD}.env${RESET} with your secrets (GROQ_API_KEY, FIRECRAWL_API_KEY, etc.)"
  echo -e "    2. Run:  ${BOLD}bash scripts/start-stack.sh${RESET}"
  echo -e "    3. Test: ${BOLD}npm run test:e2e${RESET}"
  echo ""
  echo -e "  ${CYAN}Service URLs (after start):${RESET}"
  echo -e "    Frontend       → http://localhost:3000"
  echo -e "    Backend API    → http://localhost:3001"
  echo -e "    n8n            → http://localhost:5678"
  echo -e "    Ollama         → http://localhost:11434"
  echo ""
  echo -e "  ${CYAN}Docs:${RESET} docs/INTEGRATION.md"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}${CYAN}"
  echo "  ╔═══════════════════════════════════════════════════╗"
  echo "  ║   XPS Shadow Scraper — Integration Stack Setup   ║"
  echo "  ╚═══════════════════════════════════════════════════╝"
  echo -e "${RESET}"

  check_prereqs

  mkdir -p "$TEMPLATES_DIR"

  # Clone / update all templates
  for template_def in "${TEMPLATES[@]}"; do
    IFS='|' read -r name url branch <<< "$template_def"
    clone_template "$name" "$url" "$branch"
  done

  write_template_envs

  if [[ "$SKIP_INSTALL" == "false" && "$TEMPLATES_ONLY" == "false" ]]; then
    # Install root dependencies (Playwright, etc.)
    info "Installing root dependencies..."
    (cd "$REPO_ROOT" && npm install --quiet 2>/dev/null) || warn "Root npm install had warnings"

    # Install backend dependencies
    info "Installing backend dependencies..."
    (cd "${REPO_ROOT}/backend" && npm install --quiet 2>/dev/null) || warn "Backend npm install had warnings"

    # Install frontend dependencies
    info "Installing frontend dependencies..."
    (cd "${REPO_ROOT}/frontend" && npm install --quiet 2>/dev/null) || warn "Frontend npm install had warnings"

    if [[ "$TEMPLATES_ONLY" == "false" ]]; then
      for template_def in "${TEMPLATES[@]}"; do
        IFS='|' read -r name url branch <<< "$template_def"
        install_template_deps "$name"
      done
    fi

    # Install Playwright browsers
    info "Installing Playwright browsers..."
    (cd "$REPO_ROOT" && npx playwright install chromium --with-deps --quiet 2>/dev/null) || \
      warn "Playwright browser install had warnings"
  fi

  if [[ "$TEMPLATES_ONLY" == "false" ]]; then
    generate_env
  fi

  print_summary
}

main "$@"
