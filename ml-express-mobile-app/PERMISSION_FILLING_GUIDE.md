# 📝 Google Play 权限声明填写指南

## 🎯 当前页面说明

你现在看到的是 **"Photo and video permissions"** 页面，需要填写两个字段：

1. **Read media images** (读取媒体图片)
2. **Read media video** (读取媒体视频)

每个字段限制 **250 字符以内**。

---

## ✅ 填写步骤

### 字段 1：Read media images

**在第一个文本框中，复制粘贴以下内容：**

```
Our courier app needs to read images from the device to access delivery photos saved by couriers. These photos serve as delivery proof and are essential for order verification and customer confirmation in our express delivery service.
```

**字符数：** 180 字符（符合 250 字符限制）

---

### 字段 2：Read media video

**在第二个文本框中，复制粘贴以下内容：**

```
Our courier app needs to read videos from the device to access delivery videos saved by couriers. These videos serve as delivery proof and are essential for order verification and customer confirmation in our express delivery service.
```

**字符数：** 180 字符（符合 250 字符限制）

---

## 📋 填写后的操作

1. ✅ 检查两个字段都已填写
2. ✅ 确认字符数未超过 250
3. ✅ 点击右下角的 **"Save"** 按钮保存
4. ✅ 如果不需要保存，可以点击 **"Discard"** 放弃更改

---

## 🔍 说明文本解释

### 为什么需要这些权限？

- **读取图片**：骑手在配送过程中会拍摄并保存配送照片作为凭证，应用需要读取这些照片用于上传和查看
- **读取视频**：骑手可能会拍摄配送视频作为更详细的配送凭证，应用需要读取这些视频用于上传和查看

### 核心功能

这些权限是快递配送服务的核心功能，用于：
- 保存配送凭证（照片/视频）
- 订单验证和客户确认
- 纠纷处理和证明

---

## ⚠️ 注意事项

1. **必须用英文填写**（Google Play Console 通常要求英文）
2. **字符数限制**：每个字段最多 250 字符
3. **保存后才能生效**：填写后必须点击 "Save" 按钮
4. **保存后再上传新版本**：确保权限声明已保存后再上传新的 AAB 文件

---

## 🚀 填写完成后

填写并保存权限声明后，你需要：

1. **更新版本号**（如果还没有）
   - 将 `versionCode` 更新为 7（大于现有版本 6）
   - 将 `version` 更新为 1.1.1

2. **重新构建应用**
   ```bash
   cd ml-express-mobile-app
   eas build --platform android --profile production
   ```

3. **上传新版本到 Google Play Console**
   - 确保版本号正确
   - 确保权限声明已填写并保存

---

## 📞 需要帮助？

如果填写时遇到问题：
- 检查字符数是否超过 250
- 确保使用英文填写
- 确保点击 "Save" 保存

