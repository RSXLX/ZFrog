#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MODE=""
MODE_SOURCE=""
REASON=""
RAW_ARGS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --mode-source)
      MODE_SOURCE="${2:-}"
      shift 2
      ;;
    --reason)
      REASON="${2:-}"
      shift 2
      ;;
    --raw-args)
      RAW_ARGS="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  exit 0
fi

sanitize() {
  echo "$1" | tr '\n\r|' '   ' | sed 's/[[:space:]]\+/ /g'
}

LOG_DIR="${ZFROG_CUTOVER_LOG_DIR:-$ROOT_DIR/reports/cutover}"
LOG_FILE="$LOG_DIR/dev-entry.log"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUNNER="${USER:-unknown}"

mkdir -p "$LOG_DIR"

echo "${TIMESTAMP}|mode=$(sanitize "$MODE")|source=$(sanitize "$MODE_SOURCE")|reason=$(sanitize "$REASON")|args=$(sanitize "$RAW_ARGS")|runner=$(sanitize "$RUNNER")" >> "$LOG_FILE"
