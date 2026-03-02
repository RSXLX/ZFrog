#!/bin/bash
echo "======================================"
echo "ZFrog 功能验证测试"
echo "======================================"

PROJECT="/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet"
cd $PROJECT

# Test 1: 检查状态机
echo ""
echo "【功能测试 1】状态机检查"
if grep -q "patrolling" src/renderer/hooks/useFrogState.ts; then
    echo "✅ 巡逻状态存在"
else
    echo "❌ 巡逻状态缺失"
fi

if grep -q "stretching\|yawning\|looking" src/renderer/hooks/useFrogState.ts; then
    echo "✅ 自动动作状态存在"
else
    echo "❌ 自动动作状态缺失"
fi

# Test 2: 检查交互功能
echo ""
echo "【功能测试 2】交互功能检查"
if grep -qi "click.*through\|setIgnoreMouseEvents" src/main/index.ts; then
    echo "✅ 鼠标穿透功能存在"
else
    echo "❌ 鼠标穿透功能缺失"
fi

if grep -qi "move-window\|setPosition" src/main/index.ts; then
    echo "✅ 窗口移动功能存在"
else
    echo "❌ 窗口移动功能缺失"
fi

# Test 3: 检查 hook 功能
echo ""
echo "【功能测试 3】Hook 功能检查"
HOOKS=("useMemory" "useSound" "useTimeSystem" "useDailyTasks" "useAchievements")
for hook in "${HOOKS[@]}"; do
    if [ -f "src/renderer/hooks/${hook}.ts" ]; then
        echo "✅ $hook 存在"
    else
        echo "❌ $hook 缺失"
    fi
done

# Test 4: 检查组件功能
echo ""
echo "【功能测试 4】组件功能检查"
COMPS=("InteractionBubble" "QuickMenu" "WeatherEffect" "ParticleEffect" "Notification")
for comp in "${COMPS[@]}"; do
    if grep -rq "$comp" src/renderer/components/; then
        echo "✅ $comp 组件存在"
    else
        echo "❌ $comp 组件缺失"
    fi
done

# Test 5: 检查动画变体
echo ""
echo "【功能测试 5】动画状态检查"
if grep -q "stateVariants" src/renderer/components/Frog/Frog.tsx; then
    echo "✅ 状态变体动画存在"
    
    # Count states
    STATE_COUNT=$(grep -c "idle:\|sleeping:\|eating:\|happy:\|excited:\|scared:\|dancing:\|crying:\|traveling:\|thinking:\|angry:\|greeting:\|stretching:\|yawning:\|looking:\|walking:\|patrolling:" src/renderer/components/Frog/Frog.tsx 2>/dev/null || echo 0)
    echo "   状态数量: $STATE_COUNT"
else
    echo "❌ 状态变体动画缺失"
fi

# Test 6: 检查特效
echo ""
echo "【功能测试 6】特效系统检查"
if grep -qi "effect\|status\|bubble\|particle" src/renderer/components/Frog/Frog.tsx src/renderer/components/ParticleEffect.tsx src/renderer/components/WeatherEffect.tsx 2>/dev/null; then
    echo "✅ 特效系统存在"
else
    echo "❌ 特效系统缺失"
fi

# Test 7: 打包体积检查
echo ""
echo "【功能测试 7】打包体积检查"
APP_SIZE=$(du -sh "$PROJECT/release/mac-arm64/ZetaFrog Pet.app" 2>/dev/null | cut -f1)
echo "   应用大小: $APP_SIZE"

echo ""
echo "======================================"
echo "✅ 功能验证测试完成"
echo "======================================"

# Test 8: New hooks
echo ""
echo "【功能测试 8】新增 Hook 检查"
if [ -f "src/renderer/hooks/usePetStats.ts" ]; then
    echo "✅ usePetStats 存在"
else
    echo "❌ usePetStats 缺失"
fi

if [ -f "src/renderer/hooks/usePetActions.ts" ]; then
    echo "✅ usePetActions 存在"
else
    echo "❌ usePetActions 缺失"
fi

echo ""
echo "【功能测试 9】新增组件"
[ -f "src/renderer/components/M" ]
test_checkiniGame.tsx "MiniGame 组件存在"

[ -f "src/renderer/components/StartupAnimation.tsx" ]
test_check "StartupAnimation 组件存在"

echo ""
echo "【功能测试 10】新增 Hooks"
[ -f "src/renderer/hooks/useGlobalShortcuts.ts" ]
test_check "useGlobalShortcuts 存在"

[ -f "src/renderer/hooks/useWindowSnap.ts" ]
test_check "useWindowSnap 存在"

[ -f "src/renderer/hooks/usePetAvatar.ts" ]
test_check "usePetAvatar 存在"

echo ""
echo "【功能测试 9】新增组件"
if [ -f "src/renderer/components/MiniGame.tsx" ]; then
    echo "✅ MiniGame 组件存在"
else
    echo "❌ MiniGame 组件缺失"
fi

if [ -f "src/renderer/components/StartupAnimation.tsx" ]; then
    echo "✅ StartupAnimation 组件存在"
else
    echo "❌ StartupAnimation 组件缺失"
fi

echo ""
echo "【功能测试 10】新增 Hooks"
if [ -f "src/renderer/hooks/useGlobalShortcuts.ts" ]; then
    echo "✅ useGlobalShortcuts 存在"
else
    echo "❌ useGlobalShortcuts 缺失"
fi

if [ -f "src/renderer/hooks/useWindowSnap.ts" ]; then
    echo "✅ useWindowSnap 存在"
else
    echo "❌ useWindowSnap 缺失"
fi

if [ -f "src/renderer/hooks/usePetAvatar.ts" ]; then
    echo "✅ usePetAvatar 存在"
else
    echo "❌ usePetAvatar 缺失"
fi
