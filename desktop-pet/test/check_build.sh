#!/bin/bash
echo "======================================"
echo "ZFrog 桌面宠物测试用例"
echo "======================================"

echo ""
echo "【测试 1】构建检查"
cd /Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    cat /tmp/build.log
    exit 1
fi

echo ""
echo "【测试 2】打包检查"
npx electron-builder --mac --dir > /tmp/builder.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 打包成功"
else
    echo "❌ 打包失败"
    cat /tmp/builder.log
    exit 1
fi

echo ""
echo "【测试 3】应用文件检查"
APP_PATH="/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet/release/mac-arm64/ZetaFrog Pet.app"
if [ -d "$APP_PATH" ]; then
    echo "✅ 应用存在"
else
    echo "❌ 应用不存在"
    exit 1
fi

echo ""
echo "======================================"
echo "基础测试完成"
echo "======================================"
