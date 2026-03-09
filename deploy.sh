#!/bin/bash
# ZFrog 微服务架构一键部署脚本
# 用法: ./deploy.sh [环境] [操作]
# 示例: ./deploy.sh production deploy

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

# 打印信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    command -v docker >/dev/null 2>&1 || { print_error "需要 Docker 但未安装"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { print_error "需要 Docker Compose 但未安装"; exit 1; }
    
    # 检查 Docker 运行状态
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker 守护进程未运行"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 加载环境变量
load_env() {
    if [ -f "$ENV_FILE" ]; then
        print_info "加载环境变量: $ENV_FILE"
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    else
        print_warning "环境文件不存在: $ENV_FILE，使用默认配置"
    fi
}

# 构建镜像
build() {
    print_info "构建 Docker 镜像..."
    
    docker-compose -f "$COMPOSE_FILE" build --parallel
    
    print_success "镜像构建完成"
}

# 部署服务
deploy() {
    print_info "部署服务到 $ENVIRONMENT 环境..."
    
    # 创建网络
    docker network create zfrog-network 2>/dev/null || true
    
    # 启动基础设施
    print_info "启动基础设施 (Postgres, Redis)..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # 等待数据库就绪
    print_info "等待数据库就绪..."
    sleep 5
    
    # 执行数据库迁移
    print_info "执行数据库迁移..."
    docker-compose -f "$COMPOSE_FILE" run --rm api-gateway npx prisma migrate deploy
    
    # 启动所有服务
    print_info "启动所有微服务..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    print_success "部署完成!"
    
    # 显示状态
    status
}

# 停止服务
stop() {
    print_info "停止服务..."
    docker-compose -f "$COMPOSE_FILE" down
    print_success "服务已停止"
}

# 重启服务
restart() {
    print_info "重启服务..."
    docker-compose -f "$COMPOSE_FILE" restart
    print_success "服务已重启"
}

# 查看状态
status() {
    print_info "服务状态:"
    echo "========================================="
    docker-compose -f "$COMPOSE_FILE" ps
    echo "========================================="
    
    # 健康检查
    print_info "健康检查:"
    services=("api-gateway:3000" "travel-service:3001" "wallet-service:3002" 
              "ai-service:3003" "nft-service:3004" "badge-service:3005")
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$name: 健康"
        else
            print_error "$name: 异常"
        fi
    done
}

# 查看日志
logs() {
    local service=$1
    
    if [ -n "$service" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# 数据库迁移
migrate() {
    print_info "执行数据库迁移..."
    docker-compose -f "$COMPOSE_FILE" run --rm api-gateway npx prisma migrate dev
    print_success "迁移完成"
}

# 数据库种子
seed() {
    print_info "执行数据库种子..."
    docker-compose -f "$COMPOSE_FILE" run --rm api-gateway npx prisma db seed
    print_success "种子完成"
}

# 备份数据库
backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_info "备份数据库到 $backup_name..."
    docker-compose -f "$COMPOSE_FILE" exec postgres pg_dump -U postgres zfrog > "$backup_name"
    print_success "备份完成: $backup_name"
}

# 清理
prune() {
    print_warning "清理未使用的 Docker 资源..."
    docker system prune -f
    docker volume prune -f
    print_success "清理完成"
}

# 帮助信息
help() {
    cat << EOF
ZFrog 部署脚本

用法: ./deploy.sh [环境] [操作]

环境:
  development    开发环境 (默认)
  staging        预发布环境
  production     生产环境

操作:
  deploy         完整部署 (默认)
  build          构建镜像
  start          启动服务
  stop           停止服务
  restart        重启服务
  status         查看状态
  logs [服务]    查看日志
  migrate        数据库迁移
  seed           数据库种子
  backup         备份数据库
  prune          清理资源
  help           显示帮助

示例:
  ./deploy.sh production deploy     # 生产环境部署
  ./deploy.sh development logs    # 查看开发环境日志
  ./deploy.sh production backup   # 生产环境备份

EOF
}

# 主函数
main() {
    # 显示 banner
    echo -e "${GREEN}"
    cat << "EOF"
 _____     ____  ____   _____
|__  /    |  _ \|  _ \ / _  /
  / /_____| |_) | |_) | | | |
 / /______|  _ <|  _ <| | | |
/____|    |_| \_\_| \_\\____/
EOF
    echo -e "${NC}"
    
    # 检查依赖
    check_dependencies
    
    # 加载环境变量
    load_env
    
    # 执行操作
    case $ACTION in
        deploy|start)
            deploy
            ;;
        build)
            build
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs "$3"
            ;;
        migrate)
            migrate
            ;;
        seed)
            seed
            ;;
        backup)
            backup
            ;;
        prune)
            prune
            ;;
        help|--help|-h)
            help
            ;;
        *)
            print_error "未知操作: $ACTION"
            help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
