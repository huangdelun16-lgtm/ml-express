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

download_latest() {
  local platform=$1
  local output=$2
  local url
  url=$(eas build:list --platform "$platform" --limit 1 --json 2>/dev/null | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d);
      const b=j[0];
      if (!b || b.status !== 'FINISHED') { process.exit(1); }
      console.log(b.artifacts?.applicationArchiveUrl || b.artifacts?.buildUrl || '');
    });
  ")
  if [ -z "$url" ]; then
    echo "❌ 无法获取 ${platform} 构建下载链接"
    return 1
  fi
  curl -fsSL -o "$output" "$url"
  echo "   ✓ $output"
}

download_latest ios "dist/ml-staff-${VERSION}-${BUILD}.ipa"
download_latest android "dist/ml-staff-${VERSION}-${VCODE}.aab"

echo ""
echo "✅ 完成！产物："
ls -lh "dist/ml-staff-${VERSION}-${BUILD}.ipa" "dist/ml-staff-${VERSION}-${VCODE}.aab"
