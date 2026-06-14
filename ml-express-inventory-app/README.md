# ML Inventory（平台库存 App）

独立运行的手机/平板库存管理应用，供 **Admin 后台创建的中转站合伙店铺** 使用。登录校验连接 Supabase `delivery_stores`。

**数据策略（Google Play / 多设备）**：业务数据迁移至 Supabase 专用表 `inventory_*`（与客户端/商家端/骑手端隔离）。详见 `docs/CLOUD_DATA_ARCHITECTURE.md`。当前版本仍以本机 SQLite 为主；完成云端同步后多部手机将显示一致。

## 功能

- **中转站店铺登录**（店铺代码 + 密码，须 `store_type = transit_station`）
- 商品建档、搜索、安全库存预警
- 入库 / 出库流水
- **扫码枪**：USB / Wi-Fi / 蓝牙 HID 键盘模式（入库/出库页聚焦输入框）
- **相机扫码**：查询商品并跳转入库/出库
- **标签打印**：HTML 系统打印（标签机型号待定，设置页可配置宽度与份数）

## 环境要求

- Node.js 18+
- Expo CLI / `npx expo`
- iOS 模拟器、Android 模拟器或真机（推荐平板 + 扫码枪现场测试）

## 安装与运行

```bash
cd ml-express-inventory-app
cp .env.example .env
# 填写与 Admin Web 相同的 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start
```

- 按 `i` 打开 iOS 模拟器，或 `a` 打开 Android
- 真机：安装 Expo Go，扫描终端二维码

## 登录说明

1. 在 Admin Web「合伙店铺管理」→「新增合伙店铺」，**店铺类型** 须选 **中转站**
2. 使用该店铺的 **店铺代码** + **密码** 登录本 App
3. 非中转站类型或其它合伙店铺账号将无法登录
4. 在 **设置** 中可查看当前店铺并退出登录

## 扫码枪说明

将扫码枪设为 **HID 键盘** 模式（大多数 USB/蓝牙枪默认即是）：

1. 进入 **入库** 或 **出库**
2. 保持顶部输入框聚焦
3. 扫描条码 → 枪自动输入并发送回车 → App 识别商品

## 打印说明

当前使用 `expo-print` 输出 HTML 条码标签，通过系统打印对话框选择打印机（含 AirPrint）。确定具体标签机型号后，可替换为 ESC/POS 或厂商 SDK。

## 项目结构

```
src/
  components/     ScanInputBar（扫码枪输入）
  contexts/       AuthContext（中转站店铺会话）
  services/       SQLite、库存、Supabase 登录
  navigation/     AppNavigator
  screens/        各业务页面
  types/
```

## 后续对接

云端表结构：

- 在途追踪：`inventory_pkg_tracking` / `inventory_order_tracking`（已用）
- 订单/流水/快递包：`inventory_store_items` 等（见 `supabase/migrations/20260615120000_inventory_platform_store_data.sql`）

旧占位文件：`supabase/migrations/20260531120000_inventory_cloud_sync_placeholder.sql`

## 构建独立安装包

```bash
npx expo prebuild
npx expo run:android
# 或
npx expo run:ios
```

Bundle ID：`com.mlexpress.inventory`
