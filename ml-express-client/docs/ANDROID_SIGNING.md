# 客户端 Android 签名（唯一参考）

## 问题根因

Google Play Console 登记的**上传密钥**与 EAS/本地构建使用的 keystore 不一致会导致无法发布：

| Keystore 文件 | SHA1 | 状态 |
|---------------|------|------|
| `android/app/upload-release.keystore` | `AA:FA:1E:8C:F7:B1:ED:5C:97:DE:C2:87:AB:89:5A:5F:E7:88:13:97` | **正确 — 与 Play Console 登记的上传密钥一致** |
| `android/app/release.keystore` | `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46` | 错误 — 勿用于 Play 上传 |
| EAS 历史默认凭据 | `EF:87:EA:D3:...` | 错误 — 勿再使用 |

**结论：** 必须使用 `upload-release.keystore`（alias: `upload`）构建并上传到 Play。

---

## 正式发布流程（唯一推荐）

### 1. 同步 EAS 凭据（只需做一次，或换电脑后重做）

```bash
cd ml-express-client
eas credentials --platform android
# → production → Update credentials → Upload existing keystore
# → 上传 android/app/upload-release.keystore
# → alias: upload
# → 密码见 android/gradle.properties
```

确认 EAS 显示的 SHA1 为 `AA:FA:1E:8C:...`。

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

- 上传前验证签名：`./check-signing-key.sh path/to/app.aab`
- Rollout 设为 **100%**

---

## 验证签名

```bash
# 检查本地 keystore
keytool -list -v -keystore android/app/upload-release.keystore -alias upload

# 检查待上传的 AAB
./check-signing-key.sh path/to/app.aab
```

AAB 的 SHA1 应为 `AA:FA:1E:8C:...`。

---

## 禁止事项

- 不要用 `release.keystore` 上传 Play
- 不要运行「创建新 keystore」类脚本
- 不要删除 / 更换 `upload-release.keystore`
- 不要把 `versionCode` 改小或重复

---

## 本地 Gradle 构建（可选）

```bash
./build-aab-local.sh
```

输出：`android/app/build/outputs/bundle/release/app-release.aab`
