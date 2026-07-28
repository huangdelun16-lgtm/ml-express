# ML Inventory（平台库存 App）

独立运行的手机/平板库存管理应用，供 **Admin 后台创建的中转站合伙店铺** 使用。登录校验连接 Supabase `delivery_stores`。

**数据策略**：Supabase `inventory_*` 表是唯一业务数据源（与客户端/商家端/骑手端隔离）。App 为在线专用，登录、列表读取与所有业务提交均要求联网；本机存储只保存会话、打印设置等设备配置，不承诺离线业务能力。详见 `docs/CLOUD_DATA_ARCHITECTURE.md`。

当前发布版本：**v1.7.0 (13)**。

## 功能

- **中转站店铺登录**（店铺代码 + 密码，须 `store_type = transit_station`）
- **单设备登录**（同一账号仅一台手机在线，后登录踢掉先登录）
- 入库、快递明细、打包、装车出库、到站签收、在途追踪、流水、跨境会计
- 中 / 英 / 缅 三语界面
- **扫码枪**：USB / Wi-Fi / 蓝牙 HID 键盘模式
- **相机扫码**：查询商品并快捷跳转
- **标签打印**：HTML 系统打印（标签机型号待定，设置页可配置宽度与份数）
- **在线数据**：直接读取和写入 Supabase；下拉刷新用于重新获取最新数据

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

Android 蓝牙直连优先使用 Xprinter P203A 的本地 TSPL Code128 指令；系统打印使用本机生成的 Code128 SVG 嵌入 `expo-print` HTML，不依赖 bwipjs 等外网条码图片 API。

## 项目结构

```
src/
  components/     ScanInputBar（扫码枪输入）
  contexts/       AuthContext（中转站店铺会话）
  services/       Supabase 库存、登录、TSPL / 系统打印
  navigation/     AppNavigator
  screens/        各业务页面
  types/
```

## 云端表

云端表结构：

- 在途追踪：`inventory_pkg_tracking` / `inventory_order_tracking`（已用）
- 订单/流水/快递包：`inventory_store_items` 等（见 `supabase/migrations/20260615120000_inventory_platform_store_data.sql`）

## 生产部署

**完整清单（migration、Edge Functions、EAS、验收）**：[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

```bash
# 1. 数据库（仓库根目录）
cd .. && supabase db push

# 2. Edge Functions
npm run deploy:inventory-functions

# 3. EAS 生产包
eas build --platform ios --profile production
```

Bundle ID：`com.mlexpress.inventory`

## 本地原生构建

```bash
npx expo prebuild
npx expo run:android
# 或
npx expo run:ios
```
