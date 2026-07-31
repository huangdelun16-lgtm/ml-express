# MARKET LINK STAFF v2.3.8 (77)

## 版本信息

| 平台 | 显示版本 | 构建号 |
|------|----------|--------|
| iOS | 2.3.8 | 77 |
| Android | 2.3.8 | versionCode 77 |

## EAS 构建记录（2026-07-31）

| 平台 | Build ID | 状态 |
|------|----------|------|
| iOS | `6e5ceadf-166b-4f59-bd6f-f9f874cd6fe0` | FINISHED |
| Android | `8f661e60-4d44-419d-baf0-6113c91a08d4` | FINISHED |

- iOS 日志: https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/6e5ceadf-166b-4f59-bd6f-f9f874cd6fe0
- Android 日志: https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/8f661e60-4d44-419d-baf0-6113c91a08d4

## 本地产物（gitignore，不提交）

```
dist/ml-staff-2.3.8-77.ipa   (~23 MB)
dist/ml-staff-2.3.8-77.aab   (~47 MB)
```

## 重新构建命令

```bash
cd ml-express-mobile-app
./build-release.sh
```

或分步：

```bash
cd ml-express-mobile-app
eas build --platform all --profile production --non-interactive --no-wait
# 构建完成后下载
eas build:list --platform all --limit 2
```
