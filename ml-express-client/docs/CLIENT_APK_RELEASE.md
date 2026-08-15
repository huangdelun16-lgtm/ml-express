# 客户端 Android APK 内更新发布指南

「关于我们 → 更新版本」从 Supabase 读取 `system_settings.client.android.latest_release`，
再打开其中的 `apkUrl` 下载 APK。

若浏览器显示 **`Bucket not found`**，说明 Storage 桶尚未创建或 APK 文件未上传。

## 一次性：创建 Storage 桶

> **不要**在 SQL Editor 执行 `supabase/migrations/20260724120000_app_release_storage_buckets.sql`。  
> Supabase 会报错：`must be owner of table buckets`（Storage 表由平台托管，不能用 SQL 建桶）。

在 Supabase Dashboard → **Storage → New bucket** 手动创建：

| 桶名 | Public bucket | 用途 |
|------|---------------|------|
| `client-releases` | ✅ 开启 | 客户端 APK |
| `inventory-releases` | ✅ 开启 | Inventory APK（可选） |

建议设置：

- **File size limit**：100 MB（或更大）
- **Allowed MIME types**：可留空；若需限制可填 `application/vnd.android.package-archive`

公开桶开启后，文件可通过  
`https://<project>.supabase.co/storage/v1/object/public/client-releases/文件名.apk`  
直接下载，**无需**再写 Storage RLS SQL。

## 每次发新版 APK 的流程

### 1. 构建 APK

```bash
cd ml-express-client
export EXPO_TOKEN="..."
npm run build:apk
npm run download:apk
```

将下载的文件重命名为与 SQL 一致，例如：`ml-client-2.7.0-70.apk`

### 2. 上传到 Supabase Storage

Dashboard → **Storage → client-releases → Upload file**

- 路径：桶根目录，文件名 **`ml-client-2.7.0-70.apk`**（与下面 SQL 完全一致）
- 上传后点文件 → **Get URL**，应类似：

```
https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/client-releases/ml-client-2.7.0-70.apk
```

在浏览器打开该 URL，应开始下载 APK（不是 JSON 报错）。

### 3. 更新数据库记录

SQL Editor 执行（或修改后执行）：

`docs/sql/client_android_latest_release.sql`

**务必满足：**

- `versionCode` **大于** 用户已安装版本（当前 **70**）
- `apkUrl` 与 Storage 中实际上传的文件名一致

### 4. 在 App 内验证

设置 → 关于我们 → **更新版本** → 应打开浏览器并开始下载，而不是 `404 Bucket not found`。

## 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `Bucket not found` | 桶未创建 | 执行 migration 或手动建桶 |
| `404` / `Object not found` | 桶有，但 APK 未上传或文件名不对 | 上传 APK，核对 URL 文件名 |
| 提示已是最新 | `versionCode` 未递增 | SQL 里把 `versionCode` 改大 |
| iOS | 不走 APK 链接 | 配置 `app.json` → `ios.appStoreUrl`，或 TestFlight |

## Google Play 用户

通过 Play 商店安装的用户一般不需要此 APK 链接；此功能主要用于 ** sideload / 内部测试包** 的直装更新。
