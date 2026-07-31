#!/bin/bash
# 骑手端 App 构建 IPA + AAB 并下载到 dist/
set -e

cd "$(dirname "$0")"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ 请设置 EXPO_TOKEN（.env 或 export）"
  exit 1
fi

VERSION=$(node -p "require('./app.json').expo.version")
VCODE=$(node -p "require('./app.json').expo.android.versionCode")
BUILD=$(node -p "require('./app.json').expo.ios.buildNumber")

echo "🚀 构建 MARKET LINK STAFF v${VERSION} (${VCODE}/${BUILD})"
echo ""

mkdir -p dist

echo "🔨 EAS 构建 iOS + Android（production）..."
eas build --platform all --profile production --non-interactive

echo ""
echo "📥 下载构建产物到 dist/..."

IOS_ID=$(eas build:list --platform ios --limit 1 --json --non-interactive | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); console.log(j[0]?.id||'');
  });
")
ANDROID_ID=$(eas build:list --platform android --limit 1 --json --non-interactive | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); console.log(j[0]?.id||'');
  });
")

if [ -n "$IOS_ID" ]; then
  (cd dist && eas build:download --build-id "$IOS_ID" --non-interactive)
  mv dist/*.ipa "dist/ml-staff-${VERSION}-${BUILD}.ipa" 2>/dev/null || true
fi

if [ -n "$ANDROID_ID" ]; then
  (cd dist && eas build:download --build-id "$ANDROID_ID" --non-interactive)
  mv dist/*.aab "dist/ml-staff-${VERSION}-${VCODE}.aab" 2>/dev/null || true
fi

echo ""
echo "✅ 完成！产物："
ls -lh dist/ml-staff-${VERSION}-* 2>/dev/null || ls -lh dist/
