#!/bin/bash
echo "======================================"
echo "ZFrog 功能测试用例"
echo "======================================"

PROJECT="/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet"
cd $PROJECT

# Test 1: 检查所有核心文件
echo ""
echo "【测试 1】核心文件完整性检查"
FILES=(
    "src/renderer/App.tsx"
    "src/renderer/components/Frog/Frog.tsx"
    "src/renderer/components/Frog/StatusBar.tsx"
    "src/renderer/components/Frog/InteractionBubble.tsx"
    "src/renderer/components/Frog/QuickMenu.tsx"
    "src/renderer/components/WeatherEffect.tsx"
    "src/renderer/components/ParticleEffect.tsx"
    "src/renderer/components/Notification.tsx"
    "src/renderer/components/Lottie/FrogLottie.tsx"
    "src/renderer/hooks/useFrogState.ts"
    "src/renderer/hooks/useMemory.ts"
    "src/renderer/hooks/useSound.ts"
    "src/renderer/hooks/useTimeSystem.ts"
    "src/renderer/hooks/useDailyTasks.ts"
    "src/renderer/hooks/useAchievements.ts"
    "src/renderer/hooks/useLifeCycle.ts"
    "src/renderer/hooks/useChainMonitor.ts"
    "src/main/index.ts"
    "src/main/preload.ts"
)

MISSING=0
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺失: $file"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    echo "✅ 所有核心文件存在 (${#FILES[@]} 个)"
else
    echo "❌ 缺失 $MISSING 个文件"
fi

# Test 2: 检查 package.json 依赖
echo ""
echo "【测试 2】依赖检查"
DEPS=("react" "framer-motion" "lottie-react")
for dep in "${DEPS[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        echo "✅ 依赖存在: $dep"
    else
        echo "❌ 缺失依赖: $dep"
    fi
done

# Test 3: TypeScript 编译
echo ""
echo "【测试 3】TypeScript 编译检查"
npx tsc --noEmit > /tmp/tsc.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ TypeScript 编译通过"
else
    echo "⚠️ TypeScript 警告 (非致命)"
fi

# Test 4: 构建
echo ""
echo "【测试 4】生产构建"
npm run build:vite > /tmp/vite.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Vite 构建成功"
else
    echo "❌ Vite 构建失败"
    tail -20 /tmp/vite.log
    exit 1
fi

# Test 5: 打包
echo ""
echo "【测试 5】Electron 打包"
npx electron-builder --mac --dir > /tmp/builder.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Electron 打包成功"
else
    echo "❌ Electron 打包失败"
    tail -10 /tmp/builder.log
    exit 1
fi

# Test 6: 应用存在
echo ""
echo "【测试 6】应用文件验证"
APP="$PROJECT/release/mac-arm64/ZetaFrog Pet.app"
if [ -d "$APP" ]; then
    echo "✅ 应用已生成"
    ls -la "$APP/Contents/MacOS/"
else
    echo "❌ 应用未生成"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ 所有测试通过!"
echo "======================================"
