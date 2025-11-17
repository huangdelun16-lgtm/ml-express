#!/bin/bash

# Google Play 上传密钥重置自动化脚本
# 使用 Expo Token: -6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf

set -e

echo "🔐 开始配置 Google Play 上传密钥..."

# 设置 Expo Token
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"

# 进入项目目录
cd "$(dirname "$0")"

echo ""
echo "📋 步骤 1: 检查 EAS CLI 登录状态..."
eas whoami

echo ""
echo "📋 步骤 2: 配置 EAS 生成新的签名密钥..."
echo "⚠️  注意：这需要交互式操作"
echo ""
echo "请按照以下步骤操作："
echo "1. 选择 'production' 配置文件"
echo "2. 选择 'Set up a new Android Keystore'"
echo "3. 记录显示的 SHA-1、SHA-256、Key Alias 和密码信息"
echo ""

# 运行交互式命令
eas credentials --platform android

echo ""
echo "✅ EAS 凭据配置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 访问 EAS Web 界面下载 Keystore："
echo "   https://expo.dev/accounts/amt349/projects/ml-express-mobile-app/credentials"
echo ""
echo "2. 下载 production 配置的 Android Keystore 文件"
echo ""
echo "3. 运行以下命令导出证书为 PEM 文件："
echo "   keytool -export -rfc \\"
echo "     -keystore [下载的keystore文件] \\"
echo "     -alias [从EAS获取的Key Alias] \\"
echo "     -file upload_certificate.pem"
echo ""
echo "4. 在 Google Play Console 中上传 upload_certificate.pem 文件"

