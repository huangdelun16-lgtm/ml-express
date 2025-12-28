# 🔧 修复 Google Play Console 版本错误

## ❌ 错误原因

你遇到的两个错误是因为：
1. **版本号冲突**：当前 `versionCode` 是 2，但 Google Play Console 中已有版本 6
2. **无法升级**：版本号必须递增，新版本必须大于现有版本

## ✅ 已修复

我已经更新了版本号：
- ✅ `versionCode`: 2 → **7**（大于现有版本 6）
- ✅ `version`: 1.1.0 → **1.1.1**

---

## 🚀 下一步操作

### 步骤 1：重新构建应用

**重要**：必须使用更新后的版本号重新构建 AAB 文件。

```bash
cd ml-express-mobile-app
eas build --platform android --profile production
```

**或者如果你使用本地构建：**
```bash
eas build --platform android --profile production --local
```

---

### 步骤 2：等待构建完成

- EAS Build 会在云端构建你的应用
- 构建完成后，你会收到通知
- 构建时间通常需要 10-20 分钟

---

### 步骤 3：下载新的 AAB 文件

1. 登录 [Expo Dashboard](https://expo.dev)
2. 进入你的项目
3. 找到最新的构建（版本 7）
4. 下载 AAB 文件

---

### 步骤 4：上传新版本到 Google Play Console

1. 登录 [Google Play Console](https://play.google.com/console)
2. 选择应用：**ML Express Staff**
3. 进入：**发布** → **测试** → **Closed testing**
4. 点击 **"创建新版本"** 或 **"Create new release"**
5. **上传新的 AAB 文件**（版本 7）
6. 填写版本说明（可选）
7. 点击 **"保存"** 或 **"Save"**

---

### 步骤 5：验证版本号

上传后，Google Play Console 应该显示：
- ✅ **版本代码**: 7
- ✅ **版本名称**: 1.1.1

如果显示正确，之前的两个错误应该消失了。

---

## ⚠️ 重要提示

1. **不要上传旧的 AAB 文件**：必须使用新构建的版本 7 的 AAB
2. **确保权限声明已填写**：在步骤 4 之前，确保你已经填写并保存了权限声明
3. **版本号必须递增**：以后每次发布新版本，`versionCode` 必须大于 7

---

## 🔍 如果错误仍然存在

### 检查清单：

- [ ] 确认上传的是新构建的 AAB 文件（版本 7）
- [ ] 确认 Google Play Console 显示的版本代码是 7
- [ ] 确认权限声明已填写并保存
- [ ] 检查是否有其他测试轨道也有版本 6 或更高版本

### 如果版本号显示不正确：

1. 检查 `app.json` 中的 `versionCode` 是否为 7
2. 重新构建应用
3. 确保上传的是最新构建的 AAB 文件

---

## 📞 需要帮助？

如果按照上述步骤操作后仍有问题：
1. 检查 Google Play Console 中是否有其他版本的 AAB
2. 确认构建时使用的是 `production` profile
3. 检查 EAS Build 日志，确认版本号正确

