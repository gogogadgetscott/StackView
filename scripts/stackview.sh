#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PROD_COMPOSE="$ROOT_DIR/docker-compose.yml"
DEV_COMPOSE="$ROOT_DIR/docker-compose.debug.yml"

usage() {
  cat <<'EOF'
StackView helper

Usage: stackview.sh <command>
Commands:
  build           Build prod images (docker-compose.yml)
  up              Run prod stack (foreground)
  up-detach       Run prod stack detached
  down            Stop prod stack
  dev             Run dev stack (backend-dev + frontend-dev) with live reload
  dev-down        Stop dev stack
  backend-test    Run Go tests in container
  frontend-test   Run frontend tests in container
  tidy            Run go mod tidy in backend container (no Go needed locally)
  shell-backend   Shell into backend-dev container image
  shell-frontend  Shell into frontend-dev container image
  help            Show this message
EOF
}

require_compose() {
  if ! command -v docker &>/dev/null; then
    echo "docker is required" >&2
    exit 1
  fi
  if ! command -v docker compose &>/dev/null; then
    echo "docker compose plugin is required" >&2
    exit 1
  fi
}

prod() {
  docker compose -f "$PROD_COMPOSE" "$@"
}

dev() {
  docker compose -f "$DEV_COMPOSE" "$@"
}

case "${1:-help}" in
  build)
    require_compose
    prod build
    ;;
  up)
    require_compose
    prod up
    ;;
  up-detach)
    require_compose
    prod up -d
    ;;
  down)
    require_compose
    prod down
    ;;
  dev)
    require_compose
    dev up backend-dev frontend-dev
    ;;
  dev-down)
    require_compose
    dev down
    ;;
  backend-test)
    require_compose
    dev run --rm backend-test
    ;;
  frontend-test)
    require_compose
    dev run --rm frontend-test
    ;;
  tidy)
    require_compose
    dev run --rm backend-dev go mod tidy
    ;;
  shell-backend)
    require_compose
    dev run --rm -it backend-dev bash
    ;;
  shell-frontend)
    require_compose
    dev run --rm -it frontend-dev bash
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "unknown command: ${1:-}" >&2
    usage
    exit 1
    ;;
 esac
