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
  failed: string;
  modalHint: string;
  connecting: string;
  connected: string;
  connectFailed: string;
  connectedTo: string;
  disconnect: string;
  tapToConnect: string;
  close: string;
};

const zh: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: '仅搜索附近的蓝牙小票打印机。',
  start: '搜索附近小票打印机',
  scanning: '正在搜索附近小票打印机…',
  empty: '暂未发现附近的小票打印机，请确认打印机已开机并开启蓝牙。',
  found: '已发现 {count} 台打印机',
  stop: '停止搜索',
  rescan: '重新搜索',
  unavailable: 'Expo Go 不支持蓝牙扫描，请使用含原生模块的开发版或正式 IPA/APK。',
  bluetoothOff: '请先打开手机蓝牙后再搜索。',
  permissionDenied: '未授予蓝牙或定位权限，无法搜索附近设备。',
  failed: '蓝牙搜索失败，请稍后重试。',
  modalHint: '仅显示疑似小票机的设备。点击即可连接；搜索约 15 秒后自动停止。',
  connecting: '连接中…',
  connected: '已连接',
  connectFailed: '连接失败，请确认设备在附近并已开机。',
  connectedTo: '已连接：{name}',
  disconnect: '断开连接',
  tapToConnect: '点击打印机以连接',
  close: '关闭',
};

const en: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: 'Scan for nearby Bluetooth receipt printers only.',
  start: 'Scan nearby receipt printers',
  scanning: 'Scanning for receipt printers…',
  empty: 'No receipt printers found nearby. Make sure the printer is powered on with Bluetooth enabled.',
  found: '{count} printer(s) found',
  stop: 'Stop scan',
  rescan: 'Scan again',
  unavailable: 'Bluetooth scan is not available in Expo Go. Use a dev build or production IPA/APK with native modules.',
  bluetoothOff: 'Turn on Bluetooth on this phone before scanning.',
  permissionDenied: 'Bluetooth or location permission was denied. Scan cannot start.',
  failed: 'Bluetooth scan failed. Please try again.',
  modalHint: 'Only devices that look like receipt printers are shown. Tap to connect; scan stops after ~15 seconds.',
  connecting: 'Connecting…',
  connected: 'Connected',
  connectFailed: 'Connection failed. Make sure the device is nearby and powered on.',
  connectedTo: 'Connected: {name}',
  disconnect: 'Disconnect',
  tapToConnect: 'Tap a printer to connect',
  close: 'Close',
};

const my: ScanPrinterStrings = {
  title: 'Scan Printer',
  hint: 'အနီးအနားရှိ Bluetooth receipt printer များကိုသာ ရှာပါ။',
  start: 'အနီးအနား receipt printer များ ရှာမည်',
  scanning: 'Receipt printer များ ရှာနေသည်…',
  empty: 'Receipt printer မတွေ့ပါ။ Printer ဖွင့်ထားပြီး Bluetooth ဖွင့်ထားကြောင်း စစ်ပါ။',
  found: 'Printer {count} လုံး တွေ့ပြီး',
  stop: 'ရှာဖွေမှု ရပ်မည်',
  rescan: 'ထပ်မံ ရှာမည်',
  unavailable: 'Expo Go တွင် Bluetooth scan မရနိုင်ပါ။ Native module ပါ dev build သို့မဟုတ် IPA/APK သုံးပါ။',
  bluetoothOff: 'Scan မလုပ်မီ ဖုန်း Bluetooth ဖွင့်ပါ။',
  permissionDenied: 'Bluetooth/Location ခွင့်ပြုချက် မရရှိပါ။',
  failed: 'Bluetooth scan မအောင်မြင်ပါ။',
  modalHint: 'Receipt printer ဖြစ်နိုင်သော device များကိုသာ ပြပါသည်။ ချိတ်ရန် နှိပ်ပါ။ ~15 စက္ကန့်အကြာ scan ရပ်ပါမည်။',
  connecting: 'ချိတ်ဆက်နေသည်…',
  connected: 'ချိတ်ဆက်ပြီး',
  connectFailed: 'ချိတ်ဆက် မအောင်မြင်ပါ။',
  connectedTo: 'ချိတ်ဆက်ပြီး — {name}',
  disconnect: 'ချိတ်ဆက်မှု ဖြုတ်မည်',
  tapToConnect: 'Printer ကို နှိပ်ပြီး ချိတ်ပါ',
  close: 'ပိတ်ရန်',
};

export function getScanPrinterStrings(language: string): ScanPrinterStrings {
  if (language === 'en') return en;
  if (language === 'my') return my;
  return zh;
}

export function fmtScanPrinter(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
