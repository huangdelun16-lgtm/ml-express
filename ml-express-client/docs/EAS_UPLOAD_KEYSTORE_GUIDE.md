# 📤 上传 Keystore 到 EAS - 详细操作指南

## ⚠️ 重要提示

在 `eas credentials` 交互式菜单中，**不要选择**：
- ❌ "Upload credentials from credentials.json"（这个选项需要 credentials.json 文件）

**应该选择**：
- ✅ "Set up a new keystore"（设置新的 Keystore）
- ✅ 或 "Upload existing keystore"（上传现有 Keystore）

---

## 🚀 操作步骤

### 方法 1: 先创建 Keystore，再上传（推荐）

#### 步骤 1: 创建新的 Keystore

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
./create-new-keystore.sh
```

脚本会创建：
- `upload-keystore_*.jks` - Keystore 文件
- `upload_certificate_new_*.pem` - PEM 证书文件
- `keystore-info_*.txt` - 密码信息（请妥善保管）

#### 步骤 2: 上传到 EAS

```bash
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android
```

**在交互式菜单中，按以下顺序选择**：

1. **What do you want to do?**
   - 选择：`Set up a new keystore`（设置新的 Keystore）
   - **或者**：`Update credentials` → `Upload existing keystore`（如果第一个选项不可用）

2. **Select build credentials**
   - 选择：`Build Credentials WHnP9TM1KD (Default)`（默认的构建凭据）

3. **Keystore file path**
   - 输入：`upload-keystore_*.jks`（脚本生成的文件完整路径）
   - 例如：`/Users/aungmyatthu/Desktop/ml-express/ml-express-client/upload-keystore_20251212_191500.jks`

4. **Keystore password**
   - 输入：查看 `keystore-info_*.txt` 文件中的密码

5. **Key alias**
   - 输入：`upload`（或脚本中使用的 alias）

6. **Key password**
   - 输入：与 Keystore 密码相同（如果脚本生成的密码相同）

**完成！** EAS 会保存新的 Keystore。

---

### 方法 2: 直接在 EAS 中生成新的 Keystore

如果您想直接在 EAS 中生成，而不先创建本地文件：

```bash
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android
```

**在交互式菜单中**：

1. **What do you want to do?**
   - 选择：`Set up a new keystore`

2. **Select build credentials**
   - 选择：`Build Credentials WHnP9TM1KD (Default)`

3. **Generate a new keystore?**
   - 选择：`Yes`（让 EAS 自动生成）

4. EAS 会自动生成新的 Keystore 并保存

**注意**：使用此方法，您需要从 EAS 下载 Keystore 才能提取 PEM 证书。

---

## 🔍 如果菜单选项不同

如果您的 EAS CLI 版本不同，菜单选项可能略有不同。常见选项包括：

- `Set up a new keystore` / `Setup new keystore`
- `Upload existing keystore` / `Upload keystore`
- `Update credentials` → `Keystore` → `Upload existing`
- `Generate new keystore`

**关键**：选择任何与 "keystore" 相关的选项，**不要选择** "credentials.json" 相关的选项。

---

## ✅ 验证上传成功

上传完成后，再次运行：

```bash
eas credentials --platform android
```

选择 `production` → `Keystore`，应该能看到：
- ✅ Keystore 信息（不再是 "None assigned yet"）
- ✅ SHA1 指纹（应该与旧的不同）

---

## 📋 完整流程总结

1. **创建新的 Keystore**（使用脚本）
   ```bash
   ./create-new-keystore.sh
   ```

2. **上传到 EAS**
   ```bash
   eas credentials --platform android
   # 选择: Set up a new keystore
   # 输入: Keystore 文件路径、密码、alias
   ```

3. **上传 PEM 证书到 Google Play Console**
   - 使用脚本生成的 `upload_certificate_new_*.pem` 文件
   - 在 Google Play Console 的 "Request upload key reset" 页面上传

4. **重新构建 AAB**
   ```bash
   eas build --platform android --profile production
   ```

---

## 🆘 常见问题

### Q: 找不到 "Set up a new keystore" 选项？

**A**: 尝试：
- `Update credentials` → `Keystore` → `Set up new keystore`
- 或者先选择 `production`，再选择 Keystore 相关选项

### Q: 提示 "Keystore already exists"？

**A**: 这说明 EAS 中已经有 Keystore。您需要：
1. 先删除旧的（如果可能）
2. 或者选择 "Update credentials" → "Replace keystore"

### Q: 上传后如何验证？

**A**: 
```bash
eas credentials --platform android
# 选择 production → Keystore
# 查看 SHA1 指纹，应该与旧的不同
```

---

**按照以上步骤操作，应该就能成功上传新的 Keystore 了！**


