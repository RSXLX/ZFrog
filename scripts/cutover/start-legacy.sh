#!/bin/bash

# ZFrog legacy dev launcher (npm --prefix per app)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if [[ "$(uname -s)" != "Darwin" && "$DRY_RUN" != "true" ]]; then
  echo "This launcher currently supports macOS Terminal only."
  echo "Run manually:"
  echo "  npm --prefix backend run dev"
  echo "  npm --prefix frontend run dev"
  echo "  npm --prefix admin run dev"
  exit 1
fi

echo "[zfrog] Starting services with LEGACY entry"
echo "[zfrog] Root: $ROOT_DIR"

open_tab() {
  local name="$1"
  local dir="$2"
  local cmd="$3"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $name => cd '$dir' && $cmd"
    return
  fi

  osascript <<OSA
 tell application "Terminal"
   activate
   tell application "System Events"
     keystroke "t" using {command down}
   end tell
   delay 0.3
   do script "echo '🐸 ZFrog - $name'; cd '$dir' && $cmd" in front window
 end tell
OSA
}

open_tab "Backend API (legacy)" "$ROOT_DIR/backend" "npm run dev"
sleep 0.5
open_tab "Frontend (legacy)" "$ROOT_DIR/frontend" "npm run dev"
sleep 0.5
open_tab "Admin Panel (legacy)" "$ROOT_DIR/admin" "npm run dev"

echo "[zfrog] Legacy services launched"
