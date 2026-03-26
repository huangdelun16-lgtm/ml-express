# MARKET LINK EXPRESS - 应用商店上架检查清单

## 📋 总体状态
- ✅ 基本功能完整
- ✅ 多语言支持（中文、英文、缅语）
- ✅ 权限声明已配置
- ⚠️ 需要优化的项目：**15项**

---

## 🔴 必须修复（上架前必须完成）

### 1. **隐私政策和用户协议链接** ⚠️ 高优先级
**问题**: 应用中缺少隐私政策和用户协议的访问入口  
**位置**: `ProfileScreen.tsx` - "关于我们"功能显示"功能开发中"  
**修复**:
- [ ] 在"关于我们"页面添加隐私政策链接
- [ ] 在"关于我们"页面添加用户协议链接
- [ ] 确保链接指向可访问的URL（需要部署到网站）

**代码位置**: `src/screens/ProfileScreen.tsx` 第556-565行

---

### 2. **iOS App Store URL** ⚠️ 高优先级
**问题**: `app.json`中的`appStoreUrl`是占位符  
**当前值**: `https://apps.apple.com/app/market-link-express/id1234567890`  
**修复**:
- [ ] 在App Store Connect创建应用后，更新真实的App Store URL
- [ ] 或暂时移除该字段（可选）

**代码位置**: `app.json` 第23行

---

### 3. **EAS提交配置** ⚠️ 高优先级
**问题**: `eas.json`中的提交配置包含占位符  
**当前值**:
- `appleId`: "your-apple-id@example.com"
- `ascAppId`: "1234567890"
- `appleTeamId`: "ABCD123456"
- `serviceAccountKeyPath`: "./path/to/api-key.json"

**修复**:
- [ ] 更新为真实的Apple ID
- [ ] 在App Store Connect创建应用后，更新`ascAppId`
- [ ] 更新为真实的Apple Team ID
- [ ] 创建Google Play服务账号并配置`serviceAccountKeyPath`

**代码位置**: `eas.json` 第43-54行

---

### 4. **版本号一致性** ⚠️ 中优先级
**问题**: 版本号在不同文件中不一致  
**当前状态**:
- `app.json`: `version: "1.1.0"`, `buildNumber: "2"`, `versionCode: 2`
- `package.json`: `version: "1.1.0"`
- `AppStore_Metadata.md`: `version: "1.0.0"`, `buildNumber: 1`

**修复**:
- [ ] 统一所有文件中的版本号为 `1.1.0`
- [ ] 统一构建号（iOS: 2, Android: 2）

---

### 5. **Android权限说明** ⚠️ 中优先级
**问题**: Android权限列表中有重复项  
**当前权限**:
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "CAMERA",
  "READ_EXTERNAL_STORAGE",
  "WRITE_EXTERNAL_STORAGE",
  "android.permission.ACCESS_COARSE_LOCATION",  // 重复
  "android.permission.ACCESS_FINE_LOCATION"    // 重复
]
```

**修复**:
- [ ] 移除重复的权限声明
- [ ] 确保所有权限都有对应的使用说明（iOS已配置，Android需要检查）

**代码位置**: `app.json` 第67-75行

---

## 🟡 强烈建议优化（提升用户体验和审核通过率）

### 6. **Sentry错误监控初始化** 🟡 中优先级
**问题**: 代码中有Sentry服务，但需要确认是否正确初始化  
**检查**:
- [ ] 确认`App.tsx`中是否初始化了Sentry
- [ ] 配置Sentry DSN（如果使用）
- [ ] 测试错误报告功能

**代码位置**: `src/services/SentryService.ts`

---

### 7. **应用内关于页面** 🟡 中优先级
**问题**: "关于我们"功能显示"功能开发中"  
**修复**:
- [ ] 创建"关于我们"页面
- [ ] 显示应用版本号（已实现）
- [ ] 添加隐私政策链接
- [ ] 添加用户协议链接
- [ ] 添加联系方式
- [ ] 添加公司信息

**代码位置**: `src/screens/ProfileScreen.tsx` 第556-565行

---

### 8. **隐私政策URL部署** 🟡 中优先级
**问题**: 已有`Privacy_Terms.md`文档，但需要部署到可访问的URL  
**修复**:
- [ ] 将隐私政策部署到 `https://mlexpress.com/privacy`
- [ ] 将用户协议部署到 `https://mlexpress.com/terms`
- [ ] 确保URL在应用商店审核时可访问

**文档位置**: `Privacy_Terms.md`

---

### 9. **应用图标和启动画面** 🟡 低优先级
**检查**:
- [x] 应用图标已存在 (`assets/icon.png`)
- [x] 启动画面已存在 (`assets/splash.png`)
- [x] Android自适应图标已存在 (`assets/adaptive-icon.png`)
- [ ] **验证**: 确保图标符合应用商店要求（iOS: 1024x1024, Android: 512x512）

---

### 10. **应用描述和关键词** 🟡 低优先级
**检查**:
- [x] 应用描述已准备（`AppStore_Metadata.md`）
- [x] 关键词已准备
- [ ] **验证**: 确保描述符合应用商店字符限制
  - iOS: 描述最多4000字符
  - Android: 简短描述80字符，完整描述4000字符

---

## 🟢 可选优化（提升应用质量）

### 11. **应用截图准备** 🟢 低优先级
**需要**:
- [ ] iPhone截图（6.7", 6.5", 5.5"）
- [ ] iPad截图（12.9", 11"）
- [ ] Android截图（手机和平板）
- [ ] 确保截图展示核心功能

**参考**: `Screenshot_Guide.md`

---

### 12. **应用分类和年龄分级** 🟢 低优先级
**当前设置**:
- 分类: 商务 (Business)
- 年龄分级: 4+

**验证**:
- [ ] 确认分类适合应用功能
- [ ] 确认年龄分级准确

---

### 13. **Deep Link配置** 🟢 低优先级
**当前状态**: ✅ 已配置  
**验证**:
- [ ] 测试Deep Link功能
- [ ] 确保关联域名配置正确

**代码位置**: `App.tsx` 第24-41行

---

### 14. **多语言元数据** 🟢 低优先级
**当前状态**: ✅ 已准备中文、英文、缅语  
**验证**:
- [ ] 确保应用商店元数据包含所有语言版本
- [ ] 验证翻译准确性

---

### 15. **测试账号准备** 🟢 低优先级
**需要**:
- [ ] 准备测试账号（用于应用商店审核）
- [ ] 准备测试数据
- [ ] 在应用商店提交时提供测试账号信息

---

## 📝 上架前最终检查

### Google Play Store
- [ ] 所有必须修复项已完成
- [ ] 应用图标和截图已上传
- [ ] 隐私政策URL可访问
- [ ] 应用描述和关键词已填写
- [ ] 权限说明已填写
- [ ] 测试账号已提供
- [ ] 应用已通过内部测试

### Apple App Store
- [ ] 所有必须修复项已完成
- [ ] App Store Connect应用已创建
- [ ] 应用图标和截图已上传
- [ ] 隐私政策URL可访问
- [ ] 应用描述和关键词已填写
- [ ] 年龄分级已设置
- [ ] 测试账号已提供
- [ ] TestFlight测试已通过

---

## 🚀 快速修复优先级

1. **立即修复** (上架前必须):
   - 隐私政策和用户协议链接 (#1)
   - EAS提交配置 (#3)
   - 版本号一致性 (#4)

2. **尽快修复** (强烈建议):
   - iOS App Store URL (#2)
   - Android权限清理 (#5)
   - 应用内关于页面 (#7)

3. **有时间再优化**:
   - 其他所有项目

---

## 📞 需要帮助？

如果在修复过程中遇到问题，请参考：
- `AppStoreConnect_Guide.md` - App Store Connect配置指南
- `iOS_Store_Checklist.md` - iOS上架检查清单
- `Privacy_Terms.md` - 隐私政策和用户协议

