#!/usr/bin/env bash
# 将 design/app-icons/ 下的三张应用图标同步到三个 Expo App 的 assets 与（若存在）iOS AppIcon。
# 使用前请将截图重命名并放入 design/app-icons/：
#   merchant.png — 商家端 App（截图一）
#   staff.png    — 骑手端 App（截图二）
#   client.png   — 客户端 App（截图三）
#
# Android 的 mipmap/webp 由 Expo 在 prebuild / EAS Build 时根据 assets/icon 生成。
# 若本地改完图标后 Android 启动图未变，可在对应子目录执行：npx expo prebuild --clean

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/design/app-icons"

copy_one() {
  local from="$1" to="$2"
  if [[ ! -f "$from" ]]; then
    echo "跳过（文件不存在）: $from"
    return 0
  fi
  mkdir -p "$(dirname "$to")"
  cp -f "$from" "$to"
  echo "已更新: $to"
}

# 商家端
copy_one "${SRC}/merchant.png" "${ROOT}/ml-express-merchant-app/assets/icon.png"
copy_one "${SRC}/merchant.png" "${ROOT}/ml-express-merchant-app/assets/adaptive-icon.png"
copy_one "${SRC}/merchant.png" "${ROOT}/ml-express-merchant-app/assets/favicon.png"
copy_one "${SRC}/merchant.png" "${ROOT}/ml-express-merchant-app/ios/MARKETLINKEXPRESS/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"

# 骑手端（仓库内无 ios/ 时仅更新 assets，云端 EAS 会从 app.json 读取 icon）
copy_one "${SRC}/staff.png" "${ROOT}/ml-express-mobile-app/assets/icon.png"
copy_one "${SRC}/staff.png" "${ROOT}/ml-express-mobile-app/assets/adaptive-icon.png"
copy_one "${SRC}/staff.png" "${ROOT}/ml-express-mobile-app/assets/favicon.png"

# 客户端
copy_one "${SRC}/client.png" "${ROOT}/ml-express-client/assets/icon.png"
copy_one "${SRC}/client.png" "${ROOT}/ml-express-client/assets/adaptive-icon.png"
copy_one "${SRC}/client.png" "${ROOT}/ml-express-client/assets/favicon.png"
copy_one "${SRC}/client.png" "${ROOT}/ml-express-client/ios/MARKETLINKEXPRESS/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"

echo ""
echo "完成。若 merchant.png / staff.png / client.png 有缺失，对应项会显示「跳过」。"
echo "请将三张截图按上述文件名放入: ${SRC}/"
