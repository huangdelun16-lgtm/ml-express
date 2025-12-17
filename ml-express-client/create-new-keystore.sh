#!/bin/bash

# 创建全新的 Keystore 并提取 PEM 证书的脚本
# 用于解决 Google Play Console 证书重复问题

set -e

echo "🔑 创建全新的 Keystore 和证书"
echo ""

# 检查是否在正确的目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误: 请在 ml-express-client 目录下运行此脚本"
    exit 1
fi

# 检查 Java keytool
if ! command -v keytool &> /dev/null; then
    echo "❌ 错误: 未找到 keytool"
    echo "   请安装 Java JDK"
    exit 1
fi

echo "📋 步骤 1: 创建全新的 Keystore"
echo ""

# 生成唯一的文件名（使用时间戳）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEYSTORE_FILE="upload-keystore_${TIMESTAMP}.jks"
KEY_ALIAS="upload"
KEYSTORE_PASSWORD="$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)"
KEY_PASSWORD="$KEYSTORE_PASSWORD"

echo "📝 Keystore 信息："
echo "   文件: $KEYSTORE_FILE"
echo "   Alias: $KEY_ALIAS"
echo "   密码: 已自动生成（保存在 keystore-info.txt）"
echo ""

# 提示用户输入信息
echo "请输入以下信息（或按 Enter 使用默认值）："
echo ""
read -p "Keystore 密码（留空自动生成）: " USER_PASSWORD
if [ ! -z "$USER_PASSWORD" ]; then
    KEYSTORE_PASSWORD="$USER_PASSWORD"
    KEY_PASSWORD="$USER_PASSWORD"
fi

read -p "Key alias（默认: upload）: " USER_ALIAS
if [ ! -z "$USER_ALIAS" ]; then
    KEY_ALIAS="$USER_ALIAS"
fi

read -p "您的姓名/组织名称: " CN_NAME
if [ -z "$CN_NAME" ]; then
    CN_NAME="ML Express"
fi

read -p "组织单位（可选）: " OU_NAME
read -p "组织（可选）: " O_NAME
read -p "城市（可选）: " L_NAME
read -p "州/省（可选）: " ST_NAME
read -p "国家代码（默认: US）: " C_NAME
if [ -z "$C_NAME" ]; then
    C_NAME="US"
fi

# 构建 DN（Distinguished Name）
DN="CN=$CN_NAME"
if [ ! -z "$OU_NAME" ]; then
    DN="$DN, OU=$OU_NAME"
fi
if [ ! -z "$O_NAME" ]; then
    DN="$DN, O=$O_NAME"
fi
if [ ! -z "$L_NAME" ]; then
    DN="$DN, L=$L_NAME"
fi
if [ ! -z "$ST_NAME" ]; then
    DN="$DN, ST=$ST_NAME"
fi
DN="$DN, C=$C_NAME"

echo ""
echo "🔨 正在创建 Keystore..."
echo "   DN: $DN"
echo ""

# 创建 Keystore
keytool -genkeypair -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "$DN"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ 错误: Keystore 创建失败"
    exit 1
fi

echo ""
echo "✅ Keystore 创建成功！"
echo ""

# 保存 Keystore 信息到文件
INFO_FILE="keystore-info_${TIMESTAMP}.txt"
cat > "$INFO_FILE" <<EOF
Keystore 信息
=============
文件: $KEYSTORE_FILE
Alias: $KEY_ALIAS
密码: $KEYSTORE_PASSWORD
Key 密码: $KEY_PASSWORD
DN: $DN
创建时间: $(date)

⚠️  重要：请妥善保管此文件，包含 Keystore 密码！
EOF

echo "📝 Keystore 信息已保存到: $INFO_FILE"
echo ""

# 显示证书信息
echo "📋 证书信息："
keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$KEYSTORE_PASSWORD" | grep -A 2 "SHA1:"

echo ""
echo "📋 步骤 2: 导出 PEM 证书"
echo ""

# 导出 PEM 证书
PEM_FILE="upload_certificate_new_${TIMESTAMP}.pem"
keytool -export -rfc \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -file "$PEM_FILE" \
    -storepass "$KEYSTORE_PASSWORD"

if [ ! -f "$PEM_FILE" ]; then
    echo "❌ 错误: PEM 证书导出失败"
    exit 1
fi

echo "✅ PEM 证书已导出: $PEM_FILE"
echo ""

# 显示证书内容预览
echo "📋 证书内容预览："
echo "---"
head -5 "$PEM_FILE"
echo "..."
tail -5 "$PEM_FILE"
echo "---"
echo ""

# 提取 SHA1 指纹
SHA1=$(keytool -printcert -file "$PEM_FILE" 2>/dev/null | grep "SHA1:" | awk '{print $2}')
echo "📋 SHA1 指纹: $SHA1"
echo ""

echo "📤 下一步操作："
echo ""
echo "1. 上传 Keystore 到 EAS："
echo "   eas credentials --platform android"
echo "   - 选择: Android → production → Update credentials"
echo "   - 选择: Upload existing keystore"
echo "   - 上传文件: $KEYSTORE_FILE"
echo "   - 输入密码: $KEYSTORE_PASSWORD"
echo "   - 输入 alias: $KEY_ALIAS"
echo ""
echo "2. 上传 PEM 证书到 Google Play Console："
echo "   - 文件: $PEM_FILE"
echo "   - 在 'Request upload key reset' 页面上传"
echo ""
echo "3. 重新构建 AAB："
echo "   eas build --platform android --profile production"
echo ""
echo "✅ 完成！新的 Keystore 和证书已准备就绪。"
echo ""


