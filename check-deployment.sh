#!/bin/bash

# Netlify 部署状态检查脚本

echo "🚀 MARKET LINK EXPRESS - Netlify 部署检查"
echo "=========================================="

# 检查 Git 状态
echo "📋 检查 Git 状态..."
git status --porcelain
if [ $? -eq 0 ]; then
    echo "✅ Git 状态正常"
else
    echo "❌ Git 状态异常"
fi

# 检查最新提交
echo ""
echo "📝 最新提交信息:"
git log --oneline -1

# 检查构建文件
echo ""
echo "🔨 检查构建文件..."
if [ -d "build" ]; then
    echo "✅ build 目录存在"
    echo "📊 构建文件大小:"
    du -sh build/*
else
    echo "❌ build 目录不存在"
fi

# 检查配置文件
echo ""
echo "⚙️ 检查配置文件..."
if [ -f "netlify.toml" ]; then
    echo "✅ netlify.toml 存在"
    cat netlify.toml
else
    echo "❌ netlify.toml 不存在"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
    echo "📦 构建脚本:"
    grep -A 5 '"scripts"' package.json
else
    echo "❌ package.json 不存在"
fi

# 检查环境变量
echo ""
echo "🔑 环境变量检查..."
echo "需要设置的环境变量:"
echo "- REACT_APP_GOOGLE_MAPS_API_KEY"
echo "- REACT_APP_SUPABASE_URL"
echo "- REACT_APP_SUPABASE_ANON_KEY"

# 部署建议
echo ""
echo "📋 部署建议:"
echo "1. 确保在 Netlify 控制台中设置了所有环境变量"
echo "2. 检查构建日志是否有错误"
echo "3. 验证 Google Maps API Key 是否有效"
echo "4. 确认 Supabase 连接正常"

echo ""
echo "🌐 部署完成后，可以通过以下方式访问:"
echo "- Netlify 提供的默认域名"
echo "- 自定义域名（如果已配置）"

echo ""
echo "✨ 部署检查完成！"
