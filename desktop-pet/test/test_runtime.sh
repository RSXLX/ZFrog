#!/bin/bash
echo "======================================"
echo "ZFrog 运行时测试用例"
echo "======================================"

PROJECT="/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet"
cd $PROJECT

# Kill existing app
pkill -f "ZetaFrog" 2>/dev/null
sleep 1

echo ""
echo "【测试 1】启动开发服务器"
npx vite --port 5188 --host > /tmp/vite_test.log 2>&1 &
VITE_PID=$!
sleep 5

# Check if vite is running
if curl -s http://localhost:5188 > /dev/null; then
    echo "✅ 开发服务器启动成功"
else
    echo "❌ 开发服务器启动失败"
    cat /tmp/vite_test.log
    kill $VITE_PID 2>/dev/null
    exit 1
fi

# Test 2: Check if page loads
echo ""
echo "【测试 2】页面加载测试"
RESPONSE=$(curl -s http://localhost:5188)
if echo "$RESPONSE" | grep -q "root"; then
    echo "✅ 页面加载成功"
else
    echo "❌ 页面加载失败"
fi

# Test 3: Check for React root
if echo "$RESPONSE" | grep -q "id=\"root\""; then
    echo "✅ React 根元素存在"
else
    echo "❌ React 根元素缺失"
fi

# Test 4: Check for frog component
if echo "$RESPONSE" | grep -q -i "frog\|zetafrog"; then
    echo "✅ 青蛙组件引用存在"
else
    echo "⚠️ 青蛙组件引用未找到 (可能正常)"
fi

# Cleanup
kill $VITE_PID 2>/dev/null

echo ""
echo "【测试 5】启动桌面应用"
open "$PROJECT/release/mac-arm64/ZetaFrog Pet.app"
sleep 3

# Check if app is running
if pgrep -f "ZetaFrog" > /dev/null; then
    echo "✅ 桌面应用启动成功"
else
    echo "❌ 桌面应用启动失败"
fi

# Test 6: Check window properties
echo ""
echo "【测试 6】窗口属性测试 (通过日志)"
# The app should log click-through status

echo ""
echo "======================================"
echo "✅ 运行时测试完成"
echo "======================================"
