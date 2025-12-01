#!/bin/bash
# 更新 API Keys 的脚本
# 使用方法: ./UPDATE_API_KEYS.sh

echo "🔧 开始配置新的 Google Maps API Keys..."
echo ""

# Website API Key
WEBSITE_API_KEY="AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM"
# Android App API Key
ANDROID_API_KEY="AIzaSyDUGaYA0yNPDJC9QZ5Uo6dsmvW3WIHSJqc"

echo "📋 API Keys:"
echo "  Website: $WEBSITE_API_KEY"
echo "  Android: $ANDROID_API_KEY"
echo ""

# 更新本地 .env 文件
if [ -f .env ]; then
    echo "✅ 更新本地 .env 文件..."
    
    # 备份原文件
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # 更新 Website API Key
    if grep -q "REACT_APP_GOOGLE_MAPS_API_KEY" .env; then
        sed -i.bak "s|REACT_APP_GOOGLE_MAPS_API_KEY=.*|REACT_APP_GOOGLE_MAPS_API_KEY=$WEBSITE_API_KEY|" .env
        echo "  ✅ 已更新 REACT_APP_GOOGLE_MAPS_API_KEY"
    else
        echo "REACT_APP_GOOGLE_MAPS_API_KEY=$WEBSITE_API_KEY" >> .env
        echo "  ✅ 已添加 REACT_APP_GOOGLE_MAPS_API_KEY"
    fi
    
    # 更新 Android API Key
    if grep -q "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" .env; then
        sed -i.bak "s|EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=.*|EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$ANDROID_API_KEY|" .env
        echo "  ✅ 已更新 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
    else
        echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$ANDROID_API_KEY" >> .env
        echo "  ✅ 已添加 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
    fi
    
    rm -f .env.bak
    echo ""
else
    echo "⚠️  .env 文件不存在，创建新文件..."
    cat > .env << EOF
# Google Maps API Keys
REACT_APP_GOOGLE_MAPS_API_KEY=$WEBSITE_API_KEY
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$ANDROID_API_KEY
EOF
    echo "  ✅ 已创建 .env 文件"
    echo ""
fi

echo "📝 下一步操作："
echo ""
echo "1. Netlify 环境变量配置（客户端 Web）："
echo "   - 登录 https://app.netlify.com"
echo "   - 选择站点: client-ml-express"
echo "   - Site settings → Environment variables"
echo "   - 更新 REACT_APP_GOOGLE_MAPS_API_KEY = $WEBSITE_API_KEY"
echo ""
echo "2. Netlify 环境变量配置（后台管理 Web）："
echo "   - 选择站点: admin-ml-express"
echo "   - Site settings → Environment variables"
echo "   - 更新 REACT_APP_GOOGLE_MAPS_API_KEY = $WEBSITE_API_KEY"
echo ""
echo "3. EAS Secrets 配置（客户端 App）："
echo "   cd ml-express-client"
echo "   eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value $ANDROID_API_KEY --type string --force"
echo ""
echo "4. 重新部署 Netlify 站点："
echo "   - 在 Netlify Dashboard 中触发重新部署"
echo ""
echo "✅ 本地配置完成！请按照上述步骤配置 Netlify 和 EAS。"

