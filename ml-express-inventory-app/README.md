# ML Inventory（平台库存 App）

独立运行的手机/平板库存管理应用，供 **平台工作人员** 使用。数据保存在本机 SQLite，**暂不连接** Supabase、商家端或其它业务系统；后续需要时再对接。

## 功能

- 工作人员 PIN 登录（首次使用设置 PIN）
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
npm install
npx expo start
```

- 按 `i` 打开 iOS 模拟器，或 `a` 打开 Android
- 真机：安装 Expo Go，扫描终端二维码

## 首次使用

1. 打开 App，填写 **姓名** 与 **PIN**（至少 4 位）完成首次设置
2. 之后用同一 PIN 登录（姓名可修改）
3. 在 **设置** 中配置标签打印参数

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
  contexts/       AuthContext（本地 PIN）
  navigation/     AppNavigator
  screens/        各业务页面
  services/       SQLite、库存业务、打印
  types/
```

## 后续对接（占位）

云端表结构草案见仓库根目录：

`supabase/migrations/20260531120000_inventory_cloud_sync_placeholder.sql`

当前 App **不读取** 该 migration，仅作未来同步设计参考。

## 构建独立安装包

```bash
npx expo prebuild
npx expo run:android
# 或
npx expo run:ios
```

Bundle ID：`com.mlexpress.inventory`
