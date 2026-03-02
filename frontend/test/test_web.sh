#!/bin/bash
echo "========================================"
echo "ZFrog Web 端完整测试套件"
echo "========================================"

PROJECT="/Users/sxlx/.gemini/antigravity/ZFrog/frontend"
cd $PROJECT
PASS=0
FAIL=0

test_check() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
        PASS=$((PASS+1))
    else
        echo "❌ $1"
        FAIL=$((FAIL+1))
    fi
}

echo ""
echo "【测试 1.1】依赖安装检查"
[ -d "node_modules" ]
test_check "依赖已安装"

echo ""
echo "【测试 1.2】TypeScript 编译"
npx tsc --noEmit > /tmp/tsc_web.log 2>&1
test_check "TypeScript 编译"

echo ""
echo "【测试 1.3】Vite 构建"
npm run build > /tmp/vite_web.log 2>&1
test_check "Vite 构建成功"

echo ""
echo "【测试 2.1】App 入口"
[ -f "src/App.tsx" ]
test_check "App 入口存在"

echo ""
echo "【测试 2.2】main.tsx"
[ -f "src/main.tsx" ]
test_check "main.tsx 存在"

HOOKS=(
    "useChainMonitor" "useChat" "useClickThrough" "useCrossChain"
    "useFriendWebSocket" "useFrogAppearance" "useFrogData" "useFrogInteraction"
    "useFrogNurture" "useFrogState" "useFrogStatus" "useGardenFrogMovement"
    "useGardenWebSocket" "useGridEditor" "useGroupCrossChainTravel" "useHibernation"
    "useHomesteadWeb3" "useMyFrog" "usePendingTravel" "useTransaction"
    "useTravelAnimation" "useTravelQuery" "useWallet" "useWalletConnect"
    "useWebSocket" "useZetaFrog"
)

for hook in "${HOOKS[@]}"; do
    [ -f "src/hooks/${hook}.ts" ]
    test_check "${hook} hook 存在"
done

echo ""
echo "【组件目录】"
for comp in badge breed chat common crosschain friend-float frog garden home message notification travel wallet; do
    [ -d "src/components/${comp}" ]
    test_check "components/${comp} 存在"
done

echo ""
echo "【目录检查】"
[ -d "src/services" ]
test_check "services 目录存在"
[ -d "src/stores" ]
test_check "stores 目录存在"
[ -d "src/utils" ]
test_check "utils 目录存在"
[ -d "src/config" ]
test_check "config 目录存在"
[ -d "src/pages" ]
test_check "pages 目录存在"

echo ""
echo "【测试 7.1】开发服务器"
pkill -f "vite" 2>/dev/null
npm run dev > /tmp/vite_web_dev.log 2>&1 &
VITE_PID=$!
sleep 8

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ 开发服务器启动成功"
    PASS=$((PASS+1))
else
    echo "❌ 开发服务器启动失败"
    FAIL=$((FAIL+1))
fi

kill $VITE_PID 2>/dev/null
pkill -f "vite" 2>/dev/null

echo ""
echo "【测试 8.1】构建目录"
[ -d "dist" ]
test_check "dist 目录存在"

echo ""
echo "========================================"
echo "测试结果汇总"
echo "========================================"
echo "通过: $PASS"
echo "失败: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ 全部测试通过!"
    exit 0
else
    echo "❌ 存在 $FAIL 项测试失败"
    exit 1
fi
