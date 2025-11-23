# Google Play 权限声明指南

## 📋 当前状态
- **已有版本**: 版本 6 (1.0.0) 在 Internal testing
- **新版本**: 版本 7 (1.1.1) 准备发布到 Closed Testing
- **版本号已更新**: ✅ `versionCode: 7`, `version: 1.1.1`

---

## 🔐 权限声明（必须在 Google Play Console 中填写）

### 步骤 1：进入权限声明页面

1. 登录 [Google Play Console](https://play.google.com/console)
2. 选择应用：**ML Express Staff**
3. 左侧菜单：**政策** → **应用内容** → **权限**
4. 找到 **"照片和视频"** 权限部分
5. 点击 **"Go to declaration"** 或 **"前往声明"**

---

## 📝 权限使用说明（直接复制填写到 Google Play Console）

### ⚠️ 重要提示
- 每个字段限制 **250 字符以内**
- 必须用英文填写（或根据 Google Play Console 界面语言）
- 说明要简洁明了，突出核心功能

---

### 📸 第一个字段：Read media images (READ_MEDIA_IMAGES)

**直接复制以下文本填写：**

```
Our courier app needs to read images from the device to access delivery photos saved by couriers. These photos serve as delivery proof and are essential for order verification and customer confirmation in our express delivery service.
```

**中文翻译（参考）：**
```
我们的快递应用需要读取设备中的图片，以访问骑手保存的配送照片。这些照片作为配送凭证，是我们快递服务中订单验证和客户确认的核心功能。
```

**字符数：** 约 180 字符（英文）

---

### 🎥 第二个字段：Read media video (READ_MEDIA_VIDEO)

**直接复制以下文本填写：**

```
Our courier app needs to read videos from the device to access delivery videos saved by couriers. These videos serve as delivery proof and are essential for order verification and customer confirmation in our express delivery service.
```

**中文翻译（参考）：**
```
我们的快递应用需要读取设备中的视频，以访问骑手保存的配送视频。这些视频作为配送凭证，是我们快递服务中订单验证和客户确认的核心功能。
```

**字符数：** 约 180 字符（英文）

---

## 📝 权限使用说明（详细版 - 供参考）

### 核心功能
**快递配送服务**

### 权限用途说明

#### 1. 相机权限 (CAMERA)

**用途**：扫描包裹二维码和中转码，快速识别包裹信息

**核心功能说明**：
- 骑手在配送过程中需要使用相机扫描包裹上的二维码
- 通过扫描二维码验证包裹身份，确保包裹准确配送
- 扫描中转码以确认包裹在配送中心的状态
- 这是快递配送服务的核心功能，用于包裹识别和验证

**为什么需要此权限**：
- 扫描二维码是包裹配送流程的关键步骤
- 无法通过其他方式替代（如手动输入容易出错）
- 确保包裹信息的准确性和配送效率

---

#### 2. 存储权限 (READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE)

**用途**：保存和读取包裹配送照片

**核心功能说明**：
- 骑手在完成配送后需要拍摄包裹配送照片
- 保存配送完成照片作为配送凭证
- 记录包裹送达的证明，用于客户确认和纠纷处理
- 这是快递配送服务的重要记录方式

**为什么需要此权限**：
- 配送凭证是快递服务的重要记录
- 照片作为配送完成的证明，保护骑手和客户双方权益
- 无法通过其他方式替代（如纯文本记录不够直观）

---

### 权限使用场景

1. **扫描二维码场景**：
   - 骑手接收包裹时扫描二维码确认包裹信息
   - 在配送中心扫描中转码确认包裹状态
   - 送达时扫描二维码确认收件人信息

2. **拍摄配送照片场景**：
   - 完成配送后拍摄包裹送达照片
   - 保存照片作为配送凭证
   - 客户可以通过照片确认包裹已送达

---

## ✅ 填写检查清单

在 Google Play Console 中填写时，确保：

- [ ] 选择 **"是，我的应用需要这些权限"**
- [ ] 填写上述核心功能说明
- [ ] 填写权限用途说明
- [ ] 说明为什么这些权限是核心功能所必需的
- [ ] 保存并提交

---

## 🚀 下一步操作

### 1. 填写权限声明
按照上述步骤在 Google Play Console 中填写权限声明

### 2. 重新构建应用
```bash
cd ml-express-mobile-app
eas build --platform android --profile production
```

### 3. 上传新版本
- 上传版本 7 (1.1.1) 的 AAB 文件
- 确保版本号正确（versionCode: 7）
- 确保权限声明已填写

### 4. 发布到 Closed Testing
- 在 Google Play Console 中创建 Closed Testing 版本
- 上传新的 AAB 文件
- 发布到 Closed Testing

---

## 📌 注意事项

1. **版本号必须递增**：每次发布新版本，`versionCode` 必须大于之前的版本
2. **权限声明必须填写**：这是 Google Play 的强制要求，不填写无法发布
3. **权限说明要详细**：说明权限的用途和为什么是核心功能必需的
4. **保存后再上传**：确保权限声明已保存后再上传新的 AAB 文件

---

## 🆘 如果遇到问题

### 错误 1 & 2：App Bundle 升级问题
- ✅ 已解决：版本号已更新为 7（大于现有版本 6）
- 如果仍有问题，检查 Google Play Console 中是否有其他更高版本的版本号

### 错误 3：权限声明问题
- ✅ 已提供：完整的权限声明文本
- 按照上述步骤在 Google Play Console 中填写
- 确保保存后再上传新版本

---

## 📞 需要帮助？

如果填写权限声明时遇到问题，可以：
1. 查看 Google Play Console 的帮助文档
2. 参考上述权限声明文本
3. 确保所有必填项都已填写

