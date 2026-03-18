#!/bin/bash
# ZFrog 开发环境 - 在独立终端标签页中启动各服务
# 用法: ./dev.sh [--all]

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

open_tab() {
  local name=$1
  local dir=$2
  local cmd=$3

  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$dir\" && echo '🐸 [$name] 启动中...' && $cmd"
end tell
EOF
}

echo "🐸 ZFrog Dev - 启动开发环境"
echo ""

# Backend
open_tab "Backend" "$PROJECT_DIR/backend" "npm run dev"
echo "✓ Backend 终端已打开 (端口 3001)"

# Frontend
open_tab "Frontend" "$PROJECT_DIR/frontend" "npm run dev"
echo "✓ Frontend 终端已打开 (端口 5173)"

# --all 时启动 admin
if [ "${1:-}" = "--all" ]; then
  open_tab "Admin" "$PROJECT_DIR/admin" "npm run dev"
  echo "✓ Admin 终端已打开 (端口 5174)"
fi

echo ""
echo "所有服务已在独立终端窗口中启动"
