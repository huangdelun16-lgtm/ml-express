# 客户端 Android 签名（唯一参考）

## 问题根因（已确认）

仓库里曾同时存在 **多套 upload key**，导致 Play 能上架，但老用户无法 OTA 更新、只能卸载重装：

| Keystore 文件 | SHA1 | 状态 |
|---------------|------|------|
| `android/app/release.keystore` | `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46` | **正确 — 与 Play Console 登记的上传密钥一致** |
| `upload-release.keystore`（已删除） | `AA:FA:1E:8C:...` | 错误 — 勿再使用 |
| EAS 历史构建 | `EF:87:EA:D3:...` | 错误 — 勿再使用 |

**结论：** 必须使用 `release.keystore` 构建并上传到 Play；不要再创建新 keystore。

---

## 正式发布流程（唯一推荐）

### 1. 同步 EAS 凭据（只需做一次，或换电脑后重做）

```bash
cd ml-express-client
eas credentials --platform android
# → production → Update credentials → Upload existing keystore
# → 上传 android/app/release.keystore
# → alias: release
# → 密码见 android/gradle.properties
```

确认 EAS 显示的 SHA1 为 `91:4B:4F:BC:...`。

### 2. 递增版本号

- `app.json` → `android.versionCode`（必须大于 Play 线上版本）
- `android/app/build.gradle` → `versionCode` / `versionName` 同步

### 3. EAS 构建 AAB

```bash
./build-aab.sh
# 或
eas build --platform android --profile production --clear-cache
```

### 4. 上传 Play Console → Production

- Rollout 设为 **100%**
- 不要用本地 Gradle 打出来的 AAB 上传（除非确认用的也是 `release.keystore`）

---

## 验证签名

```bash
# 检查本地 keystore
keytool -list -v -keystore android/app/release.keystore -alias release

# 检查待上传的 AAB
./check-signing-key.sh path/to/app.aab
```

AAB 的 SHA1 应为 `91:4B:4F:BC:...`（upload 证书；Play 会再用应用签名密钥分发给用户）。

### 检查手机已装版本（无法更新时）

```bash
adb shell dumpsys package com.mlexpress.client | grep -A2 signatures
```

与 Play Console → **应用完整性 → 应用签名密钥** 的 SHA1 对比。不一致即签名链路问题。

---

## 禁止事项

- 不要运行「创建新 keystore」类脚本
- 不要删除 / 更换 `release.keystore`
- 不要混用 EAS 构建 + 本地 Gradle 构建上传（除非两者同一 keystore）
- 不要把 `versionCode` 改小或重复

---

## 本地 Gradle 构建（仅调试包体，不推荐上传 Play）

```bash
./build-aab-local.sh
```

输出：`android/app/build/outputs/bundle/release/app-release.aab`
