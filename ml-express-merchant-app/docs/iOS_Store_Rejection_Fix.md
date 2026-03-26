# 🍎 iOS App Store 拒绝修复指南

## ❌ 被拒原因分析

### 1. 2.1.0 Performance: App Completeness (应用完整性)
**问题**: 审核员发现了“开发中”的功能或占位符。
**具体发现**: 在下单页面的支付方式中，"二维码支付"显示为"开发中"。
**✅ 已修复**: 我们已经从代码中移除了"二维码支付"选项，只保留了"现金支付"。

### 2. 2.3.3 Performance: Accurate Metadata (元数据准确性)
**问题**: 您的截图明显是 **Android 设备**的截图（包含 Android 状态栏和底部导航条）。
**要求**: App Store **严禁**使用非 iOS 设备的截图。必须上传 iPhone 截图。

---

## 🛠️ 修复步骤

### 第一步：提交代码更新

我们已经移除了“开发中”的功能。现在需要构建新版本。

1. **推送代码**：
   ```bash
   git add .
   git commit -m "fix: 移除未完成的二维码支付功能以符合App Store审核要求"
   git push origin main
   ```

2. **重新构建 iOS 版本**：
   ```bash
   eas build --platform ios --profile production
   ```

3. **上传新构建**：
   ```bash
   eas submit --platform ios
   ```

---

### 第二步：解决截图问题 (关键！)

您**必须**更换所有截图。不能使用当前的 Android 截图。

#### 方案 A：如果您有 iPhone (推荐)
1. 在您的 iPhone 上安装 TestFlight 版本（通过 EAS Build 生成）。
2. 在 App 中截取以下页面的屏幕快照：
   - 登录/注册页面
   - 首页/下单页面
   - 订单列表页面
   - 个人中心页面
3. **不要编辑**状态栏，或者确保状态栏是标准的 iOS 样式（时间居中或左侧，电量右侧）。

#### 方案 B：使用 iOS 模拟器 (如果您有 Mac)
1. 运行 `npm run ios` 启动模拟器。
2. 使用 `Cmd + S` 在模拟器中截图。

#### 方案 C：如果只有 Windows/Android
您必须想办法获得 iOS 风格的截图。
1. **使用设计工具**: 使用 Figma 或类似工具，将您的应用界面放入 iPhone 边框中（Mockup），并遮挡住 Android 的状态栏和底部条。
2. **裁剪**: 裁剪掉截图顶部的 Android 状态栏和底部的导航条。虽然不如原生截图好，但比直接放 Android 截图要好。
   - 目标尺寸：1290 x 2796 (iPhone 6.7") 或 1242 x 2688 (iPhone 6.5")。

**⚠️ 警告**: 再次上传 Android 截图会导致再次被拒，甚至可能导致账号被调查。

---

### 第三步：检查测试账号

在 App Store Connect 的 "App Review Information" (App 审核信息) 中：

1. **提供演示账号**:
   - 用户名: `test_user` (或您创建的测试号)
   - 密码: `123456`
   
2. **备注 (Notes)**:
   - 明确说明："此 App 仅提供现金支付，二维码支付功能已移除。测试账号已提供。"
   - "This app only supports Cash on Delivery. QR Code payment has been removed. Demo account provided."

---

### 第四步：回复审核员

在 App Store Connect 的 Resolution Center (解决方案中心) 回复：

> "Dear Review Team,
> 
> Thank you for your feedback.
> 
> 1. Regarding Guideline 2.1.0: We have removed the 'QR Code Payment' feature which was marked as 'Under Development'. The app now only supports 'Cash Payment' which is fully functional.
> 
> 2. Regarding Guideline 2.3.3: We have updated all screenshots to ensure they reflect the iOS app experience and do not show Android system UI elements.
> 
> We have uploaded a new build and updated the metadata. Please review again.
> 
> Best regards."

---

### ✅ 检查清单

- [ ] 代码已更新（移除"开发中"按钮）
- [ ] 新版本已构建并上传 (Build 3)
- [ ] Android 截图已全部删除
- [ ] iOS 风格截图已上传
- [ ] 测试账号已填写
- [ ] 回复了审核员

