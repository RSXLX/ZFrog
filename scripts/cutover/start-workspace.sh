#!/bin/bash

# ZFrog workspace-first dev launcher (pnpm workspace filters)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install pnpm (or run 'corepack enable') before workspace dev start."
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" && "$DRY_RUN" != "true" ]]; then
  echo "This launcher currently supports macOS Terminal only."
  echo "Run manually from repo root:"
  echo "  pnpm --filter ./backend dev"
  echo "  pnpm --filter ./frontend dev"
  echo "  pnpm --filter ./admin dev"
  exit 1
fi

echo "[zfrog] Starting services with WORKSPACE entry"
echo "[zfrog] Root: $ROOT_DIR"

open_tab() {
  local name="$1"
  local cmd="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $name => cd '$ROOT_DIR' && $cmd"
    return
  fi

  osascript <<OSA
 tell application "Terminal"
   activate
   tell application "System Events"
     keystroke "t" using {command down}
   end tell
   delay 0.3
   do script "echo '🐸 ZFrog - $name'; cd '$ROOT_DIR' && $cmd" in front window
 end tell
OSA
}

open_tab "Backend API (workspace)" "pnpm --filter ./backend dev"
sleep 0.5
open_tab "Frontend (workspace)" "pnpm --filter ./frontend dev"
sleep 0.5
open_tab "Admin Panel (workspace)" "pnpm --filter ./admin dev"

echo "[zfrog] Workspace services launched"
echo "[zfrog] Rollback: ZFROG_DEV_ENTRY=legacy bash ./start.sh"
