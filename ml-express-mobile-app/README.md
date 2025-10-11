# 📱 Market Link Express - 移动应用

基于 React Native (Expo) 的跨平台移动应用，支持 Android 和 iOS。

**版本**: v1.0.0  
**技术栈**: React Native + Expo + TypeScript + Supabase  
**状态**: ✅ 可运行

---

## 🎉 已实现功能

### ✅ 核心功能
- **登录认证** - 使用现有 Supabase 账号登录
- **包裹列表** - 查看所有包裹，下拉刷新
- **包裹详情** - 完整的包裹信息展示
- **状态更新** - 一键更新包裹配送状态
- **拨打电话** - 一键拨打收件人电话
- **地图导航** - 一键导航到收件地址
- **审计日志** - 自动记录所有操作

### 🎨 UI 设计
- ✅ 与网站一致的蓝色主题
- ✅ Material Design 风格
- ✅ 流畅的动画效果
- ✅ 响应式布局

---

## 🚀 立即运行

### 方式1：在你的手机上测试（最快）

#### Step 1: 安装 Expo Go App
在你的 Android 或 iPhone 上：
1. 打开应用商店（Google Play 或 App Store）
2. 搜索 **"Expo Go"**
3. 下载并安装

#### Step 2: 启动开发服务器
在终端运行：
```bash
cd /Users/aungmyatthu/Desktop/MLEXPRESS/MLExpressApp
npm start
```

#### Step 3: 扫描二维码
- 服务器启动后会显示一个二维码
- 用 **Expo Go** 扫描二维码
- 应用会自动加载到你的手机上！

#### Step 4: 登录测试
- 用户名：`admin`
- 密码：`admin`

**🎉 就这么简单！无需安装 Android Studio！**

---

### 方式2：在 Android 模拟器运行

#### 前提条件
- 已安装 Android Studio
- 已创建模拟器

#### 运行命令
```bash
cd /Users/aungmyatthu/Desktop/MLEXPRESS/MLExpressApp
npm run android
```

应用会自动编译并安装到模拟器！

---

### 方式3：在 iOS 模拟器运行（仅 Mac）

```bash
cd /Users/aungmyatthu/Desktop/MLEXPRESS/MLExpressApp
npm run ios
```

---

## 📖 使用说明

### 登录
- 默认账号：`admin` / `admin`
- 或使用网站上创建的任何账号

### 查看包裹
- 登录后自动显示包裹列表
- 下拉刷新数据
- 点击包裹查看详情

### 更新状态
1. 在包裹详情页
2. 根据当前状态，显示可用的状态按钮
3. 点击按钮确认更新
4. 状态立即同步到服务器和网站

### 拨打电话
- 在包裹详情页点击"📞 拨打电话"
- 自动跳转到拨号界面

### 导航
- 在包裹详情页点击"🗺️ 导航"  
- 自动打开 Google Maps 导航

---

## 🔧 项目结构

```
MLExpressApp/
├── App.tsx                    # 主应用入口
├── app.json                   # Expo 配置
├── package.json               # 依赖配置
├── services/
│   └── supabase.ts           # Supabase 服务（与网站共用）
├── screens/
│   ├── LoginScreen.tsx       # 员工登录页面
│   ├── DashboardScreen.tsx   # 管理员仪表板
│   ├── CourierHomeScreen.tsx # 快递员首页
│   └── PackageDetailScreen.tsx  # 包裹详情
└── assets/                   # 图片资源
```

---

## 📊 数据同步

应用与网站**共享同一个 Supabase 数据库**：

- ✅ 包裹数据实时同步
- ✅ 状态更新立即反映在网站
- ✅ 审计日志统一记录
- ✅ 账号系统通用

---

## 🎯 测试账号

使用网站上的任何账号登录：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin | 管理员 | 所有权限 |

或使用你在网站"账号管理"中创建的任何账号！

---

## 📱 发布到应用商店（未来）

### Android (Google Play)
```bash
# 构建 APK
npx eas build --platform android

# 提交到 Google Play
npx eas submit --platform android
```

### iOS (App Store)
```bash
# 构建 IPA
npx eas build --platform ios

# 提交到 App Store
npx eas submit --platform ios
```

**注意**: 需要注册 Expo EAS 账号（免费）

---

## 🐛 常见问题

### Q: npm start 后无法连接？
**A**: 确保手机和电脑在同一WiFi网络

### Q: 登录失败？
**A**: 
1. 检查网络连接
2. 确认账号在网站上存在且状态为"在职"
3. 查看控制台错误信息

### Q: 如何添加新功能？
**A**: 
1. 参考 `../ml-express/src/pages/` 中的网站代码
2. 大部分逻辑可以直接复用！

---

## 💡 开发提示

### 热重载
- 保存文件后，应用会自动刷新
- 无需重新运行

### 调试
- 摇晃手机或按 Ctrl+M（模拟器）
- 选择 "Debug Remote JS"
- 在浏览器 Console 中查看日志

### 安装新依赖后
```bash
npm install
# 然后重启 Expo
npm start
```

---

## 🌟 下一步开发

### 优先功能（2-3天）
- [ ] 添加搜索功能
- [ ] 添加筛选（按状态）
- [ ] 优化 UI 细节
- [ ] 添加照片上传

### 中期功能（1-2周）
- [ ] GPS 定位和实时上传
- [ ] 地图显示
- [ ] 推送通知
- [ ] 离线支持

### 长期功能（1个月）
- [ ] 管理员仪表板
- [ ] 财务管理
- [ ] 快递员管理
- [ ] 数据统计图表

---

## 📞 需要帮助？

在 Cursor 中问我：
```
我在运行 MLExpressApp 时遇到问题：XXX
```

或：
```
我想在移动应用中添加XXX功能，怎么做？
```

---

**创建日期**: 2025-10-01  
**基于规范**: specs/003-android-mobile-app/  
**与网站版本**: v1.0.0 兼容

**准备好了吗？运行 `npm start` 开始测试！** 🚀
