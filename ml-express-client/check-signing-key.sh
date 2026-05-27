#!/bin/bash
# 检查 AAB/APK 签名 SHA1，并与 Play 登记的上传密钥对比

set -e

EXPECTED_SHA1="91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46"

if [ -z "$1" ]; then
  echo "用法: ./check-signing-key.sh <file.aab|file.apk>"
  exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "❌ 文件不存在: $FILE"
  exit 1
fi

if ! command -v keytool &> /dev/null; then
  echo "❌ 需要 Java keytool"
  exit 1
fi

echo "📦 $FILE"
echo ""
SHA1=$(keytool -printcert -jarfile "$FILE" 2>/dev/null | grep "SHA1:" | awk '{print $2}')

if [ -z "$SHA1" ]; then
  echo "❌ 无法读取证书"
  exit 1
fi

echo "当前 SHA1:  $SHA1"
echo "Play 期望:  $EXPECTED_SHA1"
echo ""

if [ "$SHA1" = "$EXPECTED_SHA1" ]; then
  echo "✅ 签名正确，可以上传 Play Store"
else
  echo "❌ 签名不匹配！老用户将无法 OTA 更新。"
  echo "   请使用 release.keystore 重新构建，并同步 EAS 凭据。"
  echo "   详见 docs/ANDROID_SIGNING.md"
  exit 1
fi
