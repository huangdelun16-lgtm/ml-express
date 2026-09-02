export type ScanPrinterStrings = {
  title: string;
  hint: string;
  start: string;
  scanning: string;
  empty: string;
  found: string;
  stop: string;
  rescan: string;
  unavailable: string;
  bluetoothOff: string;
  permissionDenied: string;
  bluetoothStarting: string;
  failed: string;
  modalHint: string;
  connecting: string;
  connected: string;
  connectFailed: string;
  connectedTo: string;
  disconnect: string;
  tapToConnect: string;
  close: string;
  unnamedPrinter: string;
  printPreview: string;
  printPreviewTitle: string;
  printPreviewHint: string;
  printPreviewSample: string;
  printPreviewMerchantCopy: string;
  printPreviewCreatedAt: string;
  printPreviewOrderId: string;
  printPreviewStore: string;
  printPreviewPhone: string;
  printPreviewReceiver: string;
  printPreviewAddress: string;
  printPreviewPayment: string;
  printPreviewDeliveryFee: string;
  printPreviewTotal: string;
  printPreviewNotes: string;
  printPreviewQrHint: string;
  printPreviewFooter: string;
  printPreviewPrint: string;
  printPreviewPrinting: string;
  printPreviewSent: string;
  printPreviewFailed: string;
  printPreviewNotEnabled: string;
  printPreviewPaperSize: string;
  printPreviewPaper58: string;
  printPreviewPaper80: string;
  printPreviewPaperHint: string;
  printPreviewPaperWifiHint: string;
  printPreviewBleNotConnected: string;
  printPreviewBleWriteFailed: string;
  printPreviewOrderHint: string;
  printPreviewConfirmPrint: string;
  printPreviewEscPosNote: string;
};

const zh: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: '搜索附近所有蓝牙打印机（小票机、标签机、热敏打印机等）。',
  start: '搜索附近蓝牙打印机',
  scanning: '正在搜索附近蓝牙打印机…',
  empty: '暂未发现附近的蓝牙打印机，请确认打印机已开机、蓝牙已开启并在手机旁。',
  found: '已发现 {count} 台设备',
  stop: '停止搜索',
  rescan: '重新搜索',
  unavailable: 'Expo Go 不支持蓝牙扫描，请使用含原生模块的开发版或正式 IPA/APK。',
  bluetoothOff: '请先打开手机蓝牙后再搜索。',
  permissionDenied: '未授予蓝牙权限，请在系统设置中允许 MARKET LINK MERCHANT 使用蓝牙。',
  bluetoothStarting: '蓝牙尚未就绪，请确认手机蓝牙已开启后重试。',
  failed: '蓝牙搜索失败，请稍后重试。',
  modalHint: '显示附近疑似蓝牙打印机（含未广播名称的设备）。点击即可连接；搜索约 20 秒后自动停止。',
  connecting: '连接中…',
  connected: '已连接',
  connectFailed: '连接失败，请确认设备在附近并已开机。',
  connectedTo: '已连接：{name}',
  disconnect: '断开连接',
  tapToConnect: '点击打印机以连接',
  close: '关闭',
  unnamedPrinter: '蓝牙打印机 ({id}…)',
  printPreview: '打印预览',
  printPreviewTitle: '打印预览',
  printPreviewHint: '以下为测试小票样式，确认排版后可打印到已连接的蓝牙打印机。',
  printPreviewSample: '[ 测试小票 · 仅供预览 ]',
  printPreviewMerchantCopy: '*** 打包清单 / Packing List ***',
  printPreviewCreatedAt: '下单时间',
  printPreviewOrderId: '订单编号',
  printPreviewStore: '商家',
  printPreviewPhone: '电话',
  printPreviewReceiver: '收件人',
  printPreviewAddress: '地址',
  printPreviewPayment: '支付方式',
  printPreviewDeliveryFee: '跑腿费',
  printPreviewTotal: '合计金额',
  printPreviewNotes: '备注',
  printPreviewQrHint: '扫描取件 / Scan to Pickup',
  printPreviewFooter: '感谢您的配合，祝生意兴隆！',
  printPreviewPrint: '打印测试小票',
  printPreviewPrinting: '正在打印…',
  printPreviewSent: '已发送打印任务，请查看打印机输出。',
  printPreviewFailed: '打印失败，请确认打印机仍已连接并重试。',
  printPreviewNotEnabled: '请先在设置中连接蓝牙打印机后再打印。',
  printPreviewPaperSize: '纸条宽度',
  printPreviewPaper58: '58mm 小票纸',
  printPreviewPaper80: '80mm 小票纸',
  printPreviewPaperHint: '请按您实际使用的热敏纸宽度选择，预览与打印将同步调整。',
  printPreviewPaperWifiHint: '76 / 80 / 110mm 也适用于部分 Wi-Fi 热敏打印机；蓝牙小票机常用 57 / 58mm。',
  printPreviewBleNotConnected: '蓝牙打印机未连接，请返回重新连接后再打印。',
  printPreviewBleWriteFailed: '无法写入打印机，请确认设备支持 ESC/POS 小票协议并重试。',
  printPreviewOrderHint: '请确认小票内容无误后再打印到已连接的蓝牙打印机。',
  printPreviewConfirmPrint: '确认打印',
  printPreviewEscPosNote: '热敏小票机仅稳定支持英文/数字，地址中的缅文等非英文字符打印时可能被省略。',
};

const en: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: 'Scan for all nearby Bluetooth printers (receipt, label, thermal, etc.).',
  start: 'Scan nearby Bluetooth printers',
  scanning: 'Scanning for Bluetooth printers…',
  empty: 'No Bluetooth printers found nearby. Make sure the printer is powered on, Bluetooth enabled, and close to your phone.',
  found: '{count} device(s) found',
  stop: 'Stop scan',
  rescan: 'Scan again',
  unavailable: 'Bluetooth scan is not available in Expo Go. Use a dev build or production IPA/APK with native modules.',
  bluetoothOff: 'Turn on Bluetooth on this phone before scanning.',
  permissionDenied: 'Bluetooth permission was denied. Allow Bluetooth access for MARKET LINK MERCHANT in Settings.',
  bluetoothStarting: 'Bluetooth is not ready yet. Turn on Bluetooth and try again.',
  failed: 'Bluetooth scan failed. Please try again.',
  modalHint: 'Shows nearby devices that may be Bluetooth printers, including ones without a broadcast name. Tap to connect; scan stops after ~20 seconds.',
  connecting: 'Connecting…',
  connected: 'Connected',
  connectFailed: 'Connection failed. Make sure the device is nearby and powered on.',
  connectedTo: 'Connected: {name}',
  disconnect: 'Disconnect',
  tapToConnect: 'Tap a printer to connect',
  close: 'Close',
  unnamedPrinter: 'Bluetooth printer ({id}…)',
  printPreview: 'Print Preview',
  printPreviewTitle: 'Print Preview',
  printPreviewHint: 'Sample receipt layout. Print to your connected Bluetooth printer when ready.',
  printPreviewSample: '[ Sample receipt · Preview only ]',
  printPreviewMerchantCopy: '*** PACKING LIST ***',
  printPreviewCreatedAt: 'Order time',
  printPreviewOrderId: 'Order ID',
  printPreviewStore: 'Store',
  printPreviewPhone: 'Phone',
  printPreviewReceiver: 'Receiver',
  printPreviewAddress: 'Address',
  printPreviewPayment: 'Payment',
  printPreviewDeliveryFee: 'Delivery fee',
  printPreviewTotal: 'Total',
  printPreviewNotes: 'Notes',
  printPreviewQrHint: 'Scan for pickup',
  printPreviewFooter: 'Thank you for your business!',
  printPreviewPrint: 'Print test receipt',
  printPreviewPrinting: 'Printing…',
  printPreviewSent: 'Print job sent. Check your printer.',
  printPreviewFailed: 'Print failed. Make sure the printer is still connected.',
  printPreviewNotEnabled: 'Connect a Bluetooth printer in Settings before printing.',
  printPreviewPaperSize: 'Paper width',
  printPreviewPaper58: '58mm receipt',
  printPreviewPaper80: '80mm receipt',
  printPreviewPaperHint: 'Choose the thermal paper width used by your printer.',
  printPreviewPaperWifiHint: '76 / 80 / 110mm also work for many Wi-Fi thermal printers; BLE receipts often use 57 / 58mm.',
  printPreviewBleNotConnected: 'Bluetooth printer not connected. Go back and connect first.',
  printPreviewBleWriteFailed: 'Could not write to printer. Make sure it supports ESC/POS receipts.',
  printPreviewOrderHint: 'Review the receipt below, then print to your connected Bluetooth printer.',
  printPreviewConfirmPrint: 'Confirm print',
  printPreviewEscPosNote: 'Thermal printers support ASCII best; non-English address text may be omitted on paper.',
};

const my: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: 'အနီးအနားရှိ Bluetooth printer အားလုံး (receipt, label, thermal) ရှာပါ။',
  start: 'အနီးအနား Bluetooth printer များ ရှာမည်',
  scanning: 'Bluetooth printer များ ရှာနေသည်…',
  empty: 'Bluetooth printer မတွေ့ပါ။ Printer ဖွင့်ထားပြီး Bluetooth ဖွင့်ထားကြောင်း စစ်ပါ။',
  found: 'Device {count} ခု တွေ့ပြီး',
  stop: 'ရှာဖွေမှု ရပ်မည်',
  rescan: 'ထပ်မံ ရှာမည်',
  unavailable: 'Expo Go တွင် Bluetooth scan မရနိုင်ပါ။ Native module ပါ dev build သို့မဟုတ် IPA/APK သုံးပါ။',
  bluetoothOff: 'Scan မလုပ်မီ ဖုန်း Bluetooth ဖွင့်ပါ။',
  permissionDenied: 'Bluetooth ခွင့်ပြုချက် မရရှိပါ။ Settings တွင် Bluetooth ခွင့်ပြုပါ။',
  bluetoothStarting: 'Bluetooth အဆင်သင့်မဖြစ်သေးပါ။ Bluetooth ဖွင့်ပြီး ထပ်စမ်းပါ။',
  failed: 'Bluetooth scan မအောင်မြင်ပါ။',
  modalHint: 'Bluetooth printer ဖြစ်နိုင်သော device များကို ပြပါသည် (နာမည်မပါ device များ ပါဝင်)။ ~20 စက္ကန့်အကြာ scan ရပ်ပါမည်။',
  connecting: 'ချိတ်ဆက်နေသည်…',
  connected: 'ချိတ်ဆက်ပြီး',
  connectFailed: 'ချိတ်ဆက် မအောင်မြင်ပါ။',
  connectedTo: 'ချိတ်ဆက်ပြီး — {name}',
  disconnect: 'ချိတ်ဆက်မှု ဖြုတ်မည်',
  tapToConnect: 'Printer ကို နှိပ်ပြီး ချိတ်ပါ',
  close: 'ပိတ်ရန်',
  unnamedPrinter: 'Bluetooth printer ({id}…)',
  printPreview: 'Print Preview',
  printPreviewTitle: 'Print Preview',
  printPreviewHint: 'Sample receipt layout. Connected Bluetooth printer သို့ test print လုပ်နိုင်ပါသည်။',
  printPreviewSample: '[ Sample receipt · Preview only ]',
  printPreviewMerchantCopy: '*** PACKING LIST ***',
  printPreviewCreatedAt: 'Order time',
  printPreviewOrderId: 'Order ID',
  printPreviewStore: 'Store',
  printPreviewPhone: 'Phone',
  printPreviewReceiver: 'Receiver',
  printPreviewAddress: 'Address',
  printPreviewPayment: 'Payment',
  printPreviewDeliveryFee: 'Delivery fee',
  printPreviewTotal: 'Total',
  printPreviewNotes: 'Notes',
  printPreviewQrHint: 'Scan for pickup',
  printPreviewFooter: 'Thank you for your business!',
  printPreviewPrint: 'Print test receipt',
  printPreviewPrinting: 'Printing…',
  printPreviewSent: 'Print job sent.',
  printPreviewFailed: 'Print failed.',
  printPreviewNotEnabled: 'Connect a Bluetooth printer first.',
  printPreviewPaperSize: 'Paper width',
  printPreviewPaper58: '58mm receipt',
  printPreviewPaper80: '80mm receipt',
  printPreviewPaperHint: 'Choose your thermal paper width.',
  printPreviewPaperWifiHint: '76 / 80 / 110mm for many Wi-Fi thermal printers; 57 / 58mm for BLE.',
  printPreviewBleNotConnected: 'Bluetooth printer not connected.',
  printPreviewBleWriteFailed: 'Could not write to printer.',
  printPreviewOrderHint: 'Receipt အား စစ်ဆေးပြီး Bluetooth printer သို့ print လုပ်ပါ။',
  printPreviewConfirmPrint: 'Confirm print',
  printPreviewEscPosNote: 'Thermal printer များတွင် ASCII အင်္ဂလိပ်စာသာ တည်ငြိမ်စွာ ထွက်ပါသည်။',
};

export function getScanPrinterStrings(language: string): ScanPrinterStrings {
  if (language === 'en') return en;
  if (language === 'my') return my;
  return zh;
}

export function fmtScanPrinter(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
