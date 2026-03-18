#!/bin/bash
# ZFrog 本地开发启动脚本
# 用法: ./start.sh [选项]
#   ./start.sh          启动 backend + frontend
#   ./start.sh --all    启动 backend + frontend + admin
#   ./start.sh --stop   停止所有服务

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$PROJECT_DIR/.pids"

log()  { echo -e "${CYAN}[ZFrog]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# 停止所有服务
stop_all() {
  log "停止所有服务..."
  if [ -d "$PID_DIR" ]; then
    for pid_file in "$PID_DIR"/*.pid; do
      [ -f "$pid_file" ] || continue
      pid=$(cat "$pid_file")
      name=$(basename "$pid_file" .pid)
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null && ok "已停止 $name (PID: $pid)"
      fi
      rm -f "$pid_file"
    done
    rmdir "$PID_DIR" 2>/dev/null || true
  else
    warn "没有正在运行的服务"
  fi
}

# 启动单个服务
start_service() {
  local name=$1
  local dir=$2
  local port=$3

  if [ ! -d "$dir" ]; then
    err "$name 目录不存在: $dir"
    return 1
  fi

  # 检查 node_modules
  if [ ! -d "$dir/node_modules" ]; then
    log "$name: 安装依赖..."
    (cd "$dir" && npm install)
  fi

  mkdir -p "$PID_DIR"
  local log_file="$PID_DIR/${name}.log"

  log "启动 $name (端口 $port)..."
  (cd "$dir" && npm run dev > "$log_file" 2>&1 &
    echo $! > "$PID_DIR/${name}.pid")

  # 等待启动
  sleep 2
  local pid=$(cat "$PID_DIR/${name}.pid")
  if kill -0 "$pid" 2>/dev/null; then
    ok "$name 已启动 (PID: $pid, 端口: $port)"
    ok "日志: $log_file"
  else
    err "$name 启动失败，查看日志: $log_file"
    return 1
  fi
}

# 显示状态
show_status() {
  echo ""
  log "服务状态:"
  echo "─────────────────────────────────────"
  if [ -d "$PID_DIR" ]; then
    for pid_file in "$PID_DIR"/*.pid; do
      [ -f "$pid_file" ] || continue
      pid=$(cat "$pid_file")
      name=$(basename "$pid_file" .pid)
      if kill -0 "$pid" 2>/dev/null; then
        ok "$name (PID: $pid) 运行中"
      else
        err "$name (PID: $pid) 已停止"
      fi
    done
  else
    warn "无服务运行"
  fi
  echo "─────────────────────────────────────"
  echo ""
  log "查看日志: tail -f $PID_DIR/<服务名>.log"
  log "停止服务: ./start.sh --stop"
}

# 主逻辑
main() {
  echo -e "${GREEN}"
  cat << 'EOF'
  _______ ____
 |_  / __| _ \___  __ _
  / /| _||   / _ \/ _` |
 /___|_| |_|_\___/\__, |
                   |___/
EOF
  echo -e "${NC}"

  case "${1:-}" in
    --stop|-s)
      stop_all
      exit 0
      ;;
    --status)
      show_status
      exit 0
      ;;
    --help|-h)
      echo "用法: ./start.sh [选项]"
      echo ""
      echo "选项:"
      echo "  (无)       启动 backend + frontend"
      echo "  --all      启动 backend + frontend + admin"
      echo "  --stop     停止所有服务"
      echo "  --status   查看服务状态"
      echo "  --help     显示帮助"
      exit 0
      ;;
  esac

  # 先停止已有服务
  if [ -d "$PID_DIR" ]; then
    stop_all
  fi

  # 启动 backend (端口 3001)
  start_service "backend" "$PROJECT_DIR/backend" 3001

  # 启动 frontend (端口 5173)
  start_service "frontend" "$PROJECT_DIR/frontend" 5173

  # --all 时额外启动 admin
  if [ "${1:-}" = "--all" ]; then
    start_service "admin" "$PROJECT_DIR/admin" 5174
  fi

  show_status
}

main "$@"
