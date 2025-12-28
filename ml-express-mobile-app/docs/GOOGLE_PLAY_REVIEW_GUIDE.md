# Google Play 审核指南：后台位置权限演示视频

Google Play 要求所有使用 `ACCESS_BACKGROUND_LOCATION` 权限的应用必须提交一个演示视频，证明该权限对应用核心功能的必要性。

## 视频录制要求（建议时长：30-60秒）

### 录制步骤：
1. **启动应用并登录**：展示骑手登录过程。
2. **位置权限说明弹窗**：应用启动后，会看到“📍 后台位置权限说明”弹窗。点击“去设置”。
3. **系统设置演示**：在系统权限设置页面，手动将位置权限改为 **“始终允许” (Allow all the time)**。这一步非常关键。
4. **开始任务**：回到应用，点击“我的任务”或“地图”，展示当前有正在配送的任务。
5. **切换到后台**：
   - 将应用滑动到后台（回到手机桌面）。
   - 锁屏 5-10 秒。
   - 解锁屏幕。
6. **通知栏演示**：下拉通知栏，展示 **“ML Express 配送员助手”** 的持续运行通知（写着“正在为您提供实时的位置同步与派单服务”）。
7. **数据同步证明**：回到应用，展示位置依然准确更新。

### 视频中必须包含的解释（英文建议）：
- "The app tracks the courier's location in the background to ensure accurate automated task assignment even when the app is minimized or the screen is locked."
- "This ensures real-time tracking for customers and efficient delivery operations in the Myanmar region where network signals may fluctuate."

## 核心代码参考 (已在 ml-express-mobile-app 中实现)

- **权限声明**：`app.json` 中已配置 `ACCESS_BACKGROUND_LOCATION`。
- **用户告知**：`services/locationService.ts` 中的 `startBackgroundTracking` 函数实现了权限说明弹窗。
- **持续通知**：`services/locationService.ts` 中的 `enableUpdates` 配置了 `foregroundService` 选项，这在 Android 上是强制性的。

## 提交审核时的文字说明
在 Google Play Console 的权限声明表单中，请填写以下内容：
- **目的**：后台位置追踪用于在应用不活跃时持续同步骑手位置，以便调度系统根据实时位置分派最近的配送任务，并向收件人提供实时轨迹。
- **用户可见性**：应用在录制位置时，会在系统通知栏显示持续运行的通知。

