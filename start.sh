#!/bin/bash

# ZFrog unified dev launcher.
# Default entry is workspace-first; legacy can be forced by env/arg.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${ZFROG_DEV_ENTRY:-workspace}"
MODE_SOURCE="default"
LEGACY_REASON="${ZFROG_LEGACY_REASON:-}"
PASSTHROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
  case "${1:-}" in
    --legacy)
      MODE="legacy"
      MODE_SOURCE="arg"
      shift
      ;;
    --workspace|--ws)
      MODE="workspace"
      MODE_SOURCE="arg"
      shift
      ;;
    --reason)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --reason"
        exit 1
      fi
      LEGACY_REASON="${2:-}"
      shift 2
      ;;
    *)
      PASSTHROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ "$MODE_SOURCE" == "default" && -n "${ZFROG_DEV_ENTRY:-}" ]]; then
  MODE_SOURCE="env"
fi

case "$MODE" in
  legacy)
    TARGET_SCRIPT="$ROOT_DIR/scripts/cutover/start-legacy.sh"
    ;;
  workspace|ws)
    TARGET_SCRIPT="$ROOT_DIR/scripts/cutover/start-workspace.sh"
    ;;
  *)
    echo "Unsupported dev entry mode: $MODE"
    echo "Use one of: workspace, ws, legacy"
    exit 1
    ;;
esac

RAW_ARGS="${PASSTHROUGH_ARGS[*]:-}"
bash "$ROOT_DIR/scripts/cutover/log-dev-entry.sh" \
  --mode "$MODE" \
  --mode-source "$MODE_SOURCE" \
  --reason "$LEGACY_REASON" \
  --raw-args "$RAW_ARGS" || true

exec bash "$TARGET_SCRIPT" "${PASSTHROUGH_ARGS[@]}"
