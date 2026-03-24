#!/bin/bash

# Workspace cutover rollback helper (runtime rollback, no code revert)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LEGACY_REASON="${ZFROG_LEGACY_REASON:-workspace-rollback}"
PASSTHROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
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

if [[ -z "$LEGACY_REASON" ]]; then
  LEGACY_REASON="workspace-rollback"
fi

export ZFROG_LEGACY_REASON="$LEGACY_REASON"

exec bash "$ROOT_DIR/start.sh" --legacy "${PASSTHROUGH_ARGS[@]}"
