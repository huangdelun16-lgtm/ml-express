# 📝 测试者社区网站填写指南

## 🎯 你需要填写的内容

### 1. App Link Example（应用测试链接）

你需要从 Google Play Console 获取测试链接。

#### 如何获取测试链接：

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择应用：**ML Express Staff**

2. **进入测试页面**
   - 点击：**发布** → **测试** → **Closed testing**（封闭测试）
   - 点击 **"Testers"**（测试者）标签页

3. **复制测试链接**
   - 找到 **"Join on the web"**（通过网页加入）部分
   - 点击 **"Copy link"**（复制链接）
   - 你会得到一个类似这样的链接：
     ```
     https://play.google.com/apps/internaltest/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

4. **填写到网站**
   - 将复制的链接粘贴到 **"App Link Example"** 字段

---

### 2. App Icon（应用图标）

- ✅ 图标已经自动显示（ML Express 的蓝色图标）
- ✅ 如果图标显示正确，不需要修改
- ❌ 如果图标显示错误，点击红色 X 删除，然后重新上传

---

### 3. Test Credentials and Additional Instructions（测试凭证和说明）

**这是最重要的部分！** 在文本框中填写以下内容：

---

## 📋 测试说明文本（复制粘贴到文本框）

```
=== ML Express Staff - 骑手配送管理应用测试说明 ===

【应用简介】
ML Express Staff 是一款专为快递骑手设计的配送管理应用。骑手可以使用此应用查看配送任务、更新包裹状态、导航到配送地址、扫描二维码等。

【测试要求】
1. 使用 Google 账户登录 Google Play 商店
2. 点击测试链接加入测试
3. 在 Google Play 商店中下载并安装应用
4. 打开应用至少一次（Google Play 会记录活动）
5. 不需要深度测试功能，只需要安装并打开应用即可

【测试登录凭证】
应用需要登录才能使用。请使用以下测试账号：

用户名：admin
密码：admin

【测试步骤】
1. 加入测试：
   - 使用 Google 账户登录
   - 点击测试链接
   - 点击 "Become a tester"（成为测试者）

2. 安装应用：
   - 在 Google Play 商店中搜索 "ML Express Staff"
   - 或直接访问测试链接
   - 点击 "Download"（下载）或 "Install"（安装）

3. 打开应用：
   - 安装完成后，打开应用
   - 使用上述测试账号登录（用户名：admin，密码：admin）
   - 浏览应用界面（可选，但建议至少打开一次）

【注意事项】
- 必须使用 Google 账户登录 Google Play 商店
- 必须使用加入测试时使用的同一个 Google 账户
- 应用需要网络连接才能正常工作
- 应用需要位置权限（用于导航功能）
- 应用需要相机权限（用于扫描二维码）

【测试时长】
- 只需要安装并打开应用一次即可
- 不需要长期测试或写评论
- Google Play 会自动记录测试活动

【问题反馈】
如果遇到任何问题，请联系开发者或通过测试者社区反馈。

感谢您的测试支持！
```

---

## 🎯 简化版本（如果文本框太小）

如果文本框太小，可以使用这个简化版本：

```
【测试登录凭证】
用户名：admin
密码：admin

【测试步骤】
1. 使用 Google 账户登录 Google Play 商店
2. 点击测试链接，加入测试
3. 在 Google Play 商店中下载并安装应用
4. 打开应用，使用上述账号登录（用户名：admin，密码：admin）
5. 至少打开应用一次即可（Google Play 会记录活动）

【注意事项】
- 必须使用 Google 账户登录
- 应用需要网络连接
- 只需要安装并打开应用一次即可，不需要深度测试
```

---

## 📝 完整填写步骤

### 步骤 1：获取测试链接

1. 登录 Google Play Console
2. 选择应用：**ML Express Staff**
3. 进入：**发布** → **测试** → **Closed testing** → **Testers**
4. 找到 **"Join on the web"** 部分
5. 复制测试链接

### 步骤 2：填写网站表单

1. **App Link Example**：
   - 粘贴刚才复制的测试链接

2. **App Icon**：
   - 检查图标是否正确显示
   - 如果正确，不需要修改
   - 如果错误，删除并重新上传

3. **Test Credentials and Additional Instructions**：
   - 复制上面的测试说明文本
   - 粘贴到文本框中

### 步骤 3：提交表单

1. 检查所有字段都已填写
2. 点击 **"Continue >"**（继续）按钮
3. 完成后续步骤

---

## ✅ 检查清单

在提交前，确认：

- [ ] **App Link Example** 已填写（Google Play 测试链接）
- [ ] **App Icon** 显示正确（ML Express 蓝色图标）
- [ ] **Test Credentials** 已填写（包含登录凭证和测试说明）
- [ ] 所有信息准确无误

---

## 🆘 常见问题

### Q1: 如何获取测试链接？

**A:** 
1. 登录 Google Play Console
2. 进入：**发布** → **测试** → **Closed testing** → **Testers**
3. 找到 **"Join on the web"** 部分
4. 复制链接

### Q2: 测试链接格式是什么？

**A:** 测试链接格式类似：
```
https://play.google.com/apps/internaltest/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Q3: 测试者需要做什么？

**A:** 
- 使用 Google 账户登录
- 加入测试
- 安装应用
- 打开应用至少一次

### Q4: 测试者需要写评论吗？

**A:** 不需要。只需要安装并打开应用一次即可。

### Q5: 测试说明可以简化吗？

**A:** 可以。使用上面的"简化版本"即可。

---

## 🎯 总结

**需要填写的内容：**

1. ✅ **App Link Example**：Google Play 测试链接
2. ✅ **App Icon**：应用图标（通常已自动显示）
3. ✅ **Test Credentials**：测试说明文本（包含登录凭证）

**预计填写时间**：5-10 分钟

**下一步**：提交表单后，测试者社区会帮你找到测试者，然后等待测试者加入并安装应用。

