#!/bin/bash
echo "========================================"
echo "ZFrog 完整功能测试套件"
echo "========================================"

PROJECT="/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet"
cd $PROJECT
PASS=0
FAIL=0

# Test helper
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
echo "========================================"
echo "第1部分: 构建测试"
echo "========================================"

echo ""
echo "【测试 1.1】npm 依赖安装检查"
[ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]
test_check "依赖已安装"

echo ""
echo "【测试 1.2】TypeScript 编译"
npx tsc --noEmit > /tmp/tsc.log 2>&1
test_check "TypeScript 编译"

echo ""
echo "【测试 1.3】Vite 构建"
npm run build:vite > /tmp/vite.log 2>&1
test_check "Vite 构建成功"

echo ""
echo "【测试 1.4】Electron 构建"
npm run build:electron > /tmp/electron.log 2>&1
test_check "Electron 构建成功"

echo ""
echo "【测试 1.5】Electron 打包"
npx electron-builder --mac --dir > /tmp/builder.log 2>&1
test_check "Electron 打包成功"

echo ""
echo "========================================"
echo "第2部分: 文件完整性测试"
echo "========================================"

echo ""
echo "【测试 2.1】主进程文件"
[ -f "src/main/index.ts" ]
test_check "主进程文件存在"

echo ""
echo "【测试 2.2】预加载脚本"
[ -f "src/main/preload.ts" ]
test_check "预加载脚本存在"

echo ""
echo "【测试 2.3】App 入口"
[ -f "src/renderer/App.tsx" ]
test_check "App 入口存在"

echo ""
echo "【测试 2.4】青蛙组件"
[ -f "src/renderer/components/Frog/Frog.tsx" ]
test_check "青蛙组件存在"

echo ""
echo "========================================"
echo "第3部分: Hook 测试"
echo "========================================"

HOOKS=(
    "useFrogState"
    "useLifeCycle"
    "useChainMonitor"
    "useMemory"
    "useTimeSystem"
    "useAchievements"
    "useInventory"
    "useSocial"
    "useTravel"
    "usePetStats"
    "usePetActions"
    "useDailyTasks"
    "useSound"
    "useChainEvents"
)

for hook in "${HOOKS[@]}"; do
    [ -f "src/renderer/hooks/${hook}.ts" ]
    test_check "${hook} hook 存在"
done

echo ""
echo "========================================"
echo "第4部分: 组件测试"
echo "========================================"

COMPS=(
    "Frog/Frog.tsx"
    "Frog/StatusBar.tsx"
    "Frog/InteractionBubble.tsx"
    "Frog/QuickMenu.tsx"
    "WeatherEffect.tsx"
    "ParticleEffect.tsx"
    "Notification.tsx"
    "Lottie/FrogLottie.tsx"
)

for comp in "${COMPS[@]}"; do
    [ -f "src/renderer/components/${comp}" ]
    test_check "${comp} 组件存在"
done

echo ""
echo "========================================"
echo "第5部分: 对话框测试"
echo "========================================"

DIALOGS=(
    "TasksDialog.tsx"
    "FriendsDialog.tsx"
    "BadgesDialog.tsx"
    "TravelDialog.tsx"
    "SettingsDialog.tsx"
    "ChainMonitorPanel.tsx"
    "HomeDialog.tsx"
    "BagDialog.tsx"
    "ProfileDialog.tsx"
)

for dialog in "${DIALOGS[@]}"; do
    [ -f "src/renderer/components/Dialogs/${dialog}" ]
    test_check "${dialog} 存在"
done

echo ""
echo "========================================"
echo "第6部分: 功能特性测试"
echo "========================================"

echo ""
echo "【测试 6.1】状态机状态数量"
STATE_COUNT=$(grep -c "idle:\|sleeping:\|eating:\|happy:\|excited:\|scared:\|dancing:\|crying:\|traveling:\|thinking:\|angry:\|greeting:\|stretching:\|yawning:\|looking:\|walking:\|patrolling:" src/renderer/components/Frog/Frog.tsx 2>/dev/null || echo 0)
if [ "$STATE_COUNT" -ge 16 ]; then
    echo "✅ 状态数量: $STATE_COUNT (>=16)"
    PASS=$((PASS+1))
else
    echo "❌ 状态数量不足: $STATE_COUNT"
    FAIL=$((FAIL+1))
fi

echo ""
echo "【测试 6.2】IPC 处理器"
grep -q "set-click-through" src/main/index.ts
test_check "鼠标穿透 IPC"

grep -q "move-window" src/main/index.ts
test_check "窗口移动 IPC"

echo ""
echo "【测试 6.3】App.tsx 集成"
grep -q "useFrogState" src/renderer/App.tsx
test_check "useFrogState 已集成"

grep -q "usePetStats" src/renderer/App.tsx
test_check "usePetStats 已集成"

grep -q "useAchievements" src/renderer/App.tsx
test_check "useAchievements 已集成"

grep -q "useInventory" src/renderer/App.tsx
test_check "useInventory 已集成"

grep -q "useSocial" src/renderer/App.tsx
test_check "useSocial 已集成"

grep -q "useTravel" src/renderer/App.tsx
test_check "useTravel 已集成"

echo ""
echo "========================================"
echo "第7部分: 运行时测试"
echo "========================================"

echo ""
echo "【测试 7.1】开发服务器"
pkill -f "vite" 2>/dev/null
npx vite --port 5189 --host > /tmp/vite_dev.log 2>&1 &
VITE_PID=$!
sleep 5

if curl -s http://localhost:5189 > /dev/null 2>&1; then
    echo "✅ 开发服务器启动成功"
    PASS=$((PASS+1))
else
    echo "❌ 开发服务器启动失败"
    FAIL=$((FAIL+1))
fi

echo ""
echo "【测试 7.2】页面加载"
RESPONSE=$(curl -s http://localhost:5189)
if echo "$RESPONSE" | grep -q "root"; then
    echo "✅ 页面加载成功"
    PASS=$((PASS+1))
else
    echo "❌ 页面加载失败"
    FAIL=$((FAIL+1))
fi

# Kill vite
kill $VITE_PID 2>/dev/null

echo ""
echo "【测试 7.3】桌面应用启动"
pkill -f "ZetaFrog" 2>/dev/null
sleep 1
open "$PROJECT/release/mac-arm64/ZetaFrog Pet.app" &
sleep 3

if pgrep -f "ZetaFrog" > /dev/null; then
    echo "✅ 桌面应用启动成功"
    PASS=$((PASS+1))
else
    echo "❌ 桌面应用启动失败"
    FAIL=$((FAIL+1))
fi

echo ""
echo "========================================"
echo "第8部分: 性能测试"
echo "========================================"

echo ""
echo "【测试 8.1】应用大小"
APP_SIZE=$(du -sh "$PROJECT/release/mac-arm64/ZetaFrog Pet.app" 2>/dev/null | cut -f1)
echo "   应用大小: $APP_SIZE"
if [ -d "$PROJECT/release/mac-arm64/ZetaFrog Pet.app" ]; then
    echo "✅ 应用已生成"
    PASS=$((PASS+1))
else
    echo "❌ 应用未生成"
    FAIL=$((FAIL+1))
fi

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
