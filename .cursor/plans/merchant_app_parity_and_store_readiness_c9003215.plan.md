---
name: Merchant App Parity and Store Readiness
overview: Implement missing merchant web features in the app and prepare configurations for iOS/Android store submission.
todos:
  - id: |-
      app-dashboard-upgrade展柜升级项目架构记录及说明：

      本指南旨在记录 **MARKET LINK EXPRESS** 商家端 App 的最新功能升级计划及其与 Web 端的对齐架构。

      ### 1. 核心功能同步 (与 Web 端对齐)
      - **自动化经营管理 (Merchant Autopilot)**:
        - 引入“状态覆盖”系统：在 `ProfileScreen` 增加“延长 1 小时打烊”和“立即关店”按钮。
        - 完善“休假预设”：支持商家选择具体的休假日期，数据同步至 `delivery_stores.vacation_dates`。
      - **高级财务对账 (Advanced COD Stats)**:
        - 在 App 端首页增加更精细的营收统计图表（如：今日 vs 昨日对比）。
        - 支持在 COD 订单列表中直接标记“已线下结算”。
      - **手动补打小票 (Manual Printing)**:
        - 在 `OrderDetailScreen` 增加“重新打印小票”按钮，复用 `PrinterService` 逻辑。

      ### 2. 应用商店上架准备 (App Store / Google Play)
      - **多语言权限声明**:
        - 在 `app.json` 中配置专业的、包含中/英/缅三语的隐私权限描述（相机、定位、相册）。
      - **账号注销合规**:
        - 确保 `ProfileScreen` 中的“注销账号”逻辑完全符合 Apple 对于用户数据删除的强制要求。
      - **构建优化**:
        - 统一全端版本号为 `2.3.5`，配置 Android 的 `versionCode` 和 iOS 的 `buildNumber` 以支持 EAS 自动化构建。

      ### 3. 技术架构优化
      - **状态归一化**: 确保 App 端处理“待收款”与“待取件”的逻辑与 Web 端 100% 一致。
      - **资源加速**: 图片上传改用字节流转换方案，解决大型商品图片在弱网环境下的上传失败问题。

      ---
      **确认后请回复“执行”，我将开始实施上述 App 端的升级工作。**
    content: Add revenue charts and granular stats to HomeScreen.tsx
    status: in_progress
isProject: false
---

### Phase 1: Feature Parity with Merchant Web

#### 1. Dashboard Enhancements

- Update `ml-express-merchant-app/src/screens/HomeScreen.tsx` to include a revenue breakdown chart (using styled Views for bar charts to avoid adding heavy libraries).
- Add specific counters for "Urgent" vs "Standard" deliveries.

#### 2. Business Management Upgrades

- **Status Overrides**: Add "Extend 1 Hour" and "Close Immediately" buttons to `ml-express-merchant-app/src/screens/ProfileScreen.tsx`, matching the web logic that updates `manual_override_status` in the `delivery_stores` table.
- **Vacation Scheduling**: Implement a "Vacation Dates" section in `ProfileScreen.tsx` allowing merchants to pick multiple dates. I will use a simple list of selected dates with a date picker for each entry since a full calendar library is not present.

#### 3. Order Management Polish

- **Manual Receipt Printing**: Add a "Reprint Receipt" button in `ml-express-merchant-app/src/screens/OrderDetailScreen.tsx`.
- **COD Settlement**: Ensure the app allows marking COD as "pending" or "settled" if the merchant has permissions, mirroring the web's finance management capabilities.

### Phase 2: App Store Submission Readiness

#### 1. Configuration & Metadata

- Update `ml-express-merchant-app/app.json`:
  - Synchronize versioning to `2.3.5`.
  - Localize and professionalize permission strings (NSLocation, NSCamera, etc.) in English, Chinese, and Burmese.
  - Set up proper build numbers for iOS and Android.

#### 2. Final Polishing

- **Z-Index & Modals**: Verify all modals have proper `zIndex` and `backdropFilter` (using `Modal`'s native properties in React Native).
- **Performance**: Optimize data fetching in `HomeScreen.tsx` to use more efficient Supabase queries.

### Implementation Details:

- **Status Override Logic**:

```typescript
const handleExtendHour = async () => {
  // logic to update store override status + 1 hour
};
const handleCloseImmediately = async () => {
  // logic to set closed status immediately
};
```

- **Receipt Print Re-use**:
Reuse `PrinterService.printReceipt(order)` logic inside `OrderDetailScreen.tsx`.

