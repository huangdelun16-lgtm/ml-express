#!/bin/bash
# 客户端 App — Google Play 正式版 AAB（EAS Cloud Build）
# 用法: export EXPO_TOKEN=... && ./build-aab.sh

set -e
cd "$(dirname "$0")"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ 请设置 EXPO_TOKEN（https://expo.dev/settings/access-tokens）"
  exit 1
fi

echo "📋 版本: $(node -p "require('./app.json').expo.version") (code $(node -p "require('./app.json').expo.android.versionCode"))"
echo "🔑 签名: 使用 EAS production 凭据，须为 release.keystore (SHA1 91:4B:4F:BC:...)"
echo "   详见 docs/ANDROID_SIGNING.md"
echo ""

if ! command -v eas &> /dev/null; then
  echo "❌ 未安装 eas-cli: npm i -g eas-cli"
  exit 1
fi

eas build --platform android --profile production --non-interactive "$@"

echo ""
echo "✅ 构建完成后: eas build:list --platform android --limit 1"
echo "   上传前请运行: ./check-signing-key.sh <下载的.aab>"
