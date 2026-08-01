import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import {
  getReceiptPaperLabel,
  RECEIPT_PAPER_WIDTH_OPTIONS,
  type ReceiptPaperWidthMm,
} from '../../constants/receiptPaper';
import {
  isSecureContextForBluetooth,
  isWebBluetoothSupported,
  type PrinterConnectionType,
  type WebPrinterSettings,
} from '../../services/printerSettings';
import { saveReceiptPaperWidth, loadReceiptPaperWidth } from '../../services/receiptPaperSettings';
import { webPrinterService, testWifiBridge } from '../../services/webPrinterService';
import {
  buildReceiptItemDisplays,
} from '../../utils/receiptItemFormat';
import {
  computeReceiptTotals,
  createSampleReceiptData,
} from '../../utils/merchantReceiptTemplate';
import { itemLabelForEscPos } from '../../utils/escposText';
import './merchantPrinterModal.css';

export type MerchantPrinterModalProps = {
  open: boolean;
  language: MerchantLanguage;
  storeName?: string;
  storePhone?: string;
  onClose: () => void;
};

function getCopy(language: MerchantLanguage) {
  const zh = language === 'zh';
  const my = language === 'my';
  return {
    title: zh ? '打印机设置' : my ? 'Printer Settings' : 'Printer Settings',
    hint: zh
      ? '支持浏览器打印、Web 蓝牙热敏机、Wi-Fi 打印桥接。纸宽与 App 小票机设置一致。'
      : 'Browser print, Web Bluetooth thermal, or Wi-Fi print bridge. Paper width matches the merchant app.',
    tabSystem: zh ? '浏览器打印' : 'Browser',
    tabBluetooth: zh ? '蓝牙小票机' : 'Bluetooth',
    tabWifi: zh ? 'Wi-Fi 打印机' : 'Wi-Fi',
    paper: zh ? '纸条宽度' : 'Paper width',
    paperHint: zh
      ? '76/80/110mm 适合 Wi-Fi 热敏机；57/58mm 适合蓝牙小票机。'
      : '76/80/110mm for Wi-Fi thermal; 57/58mm for Bluetooth receipts.',
    autoPrint: zh ? '接单后自动打印小票' : 'Auto-print on accept',
    connectBle: zh ? '选择并连接蓝牙打印机' : 'Choose Bluetooth printer',
    disconnectBle: zh ? '断开蓝牙' : 'Disconnect',
    bleConnected: zh ? '已连接' : 'Connected',
    bleNotConnected: zh ? '未连接' : 'Not connected',
    bleNote: zh
      ? '需 Chrome/Edge + HTTPS。Web 蓝牙需每次点击授权，无法像 App 一样后台扫描列表。'
      : 'Requires Chrome/Edge + HTTPS. Web Bluetooth needs a user click each session.',
    wifiHost: zh ? '打印机 IP' : 'Printer IP',
    wifiPort: zh ? '端口' : 'Port',
    wifiBridge: zh ? '打印桥接 URL（可选）' : 'Print bridge URL',
    wifiBridgeHint: zh
      ? '浏览器无法直连 TCP:9100。若你有本地 Print Bridge 服务，填其 POST 地址；否则请用「浏览器打印」或将打印机添加到系统。'
      : 'Browsers cannot open raw TCP :9100. Use a local print bridge POST URL, or use Browser print.',
    testPrint: zh ? '打印测试小票' : 'Print test receipt',
    preview: zh ? '小票预览' : 'Receipt preview',
    close: zh ? '关闭' : 'Close',
    save: zh ? '保存设置' : 'Save settings',
    saved: zh ? '设置已保存' : 'Settings saved',
    printOk: zh ? '已发送打印任务' : 'Print job sent',
    printFail: zh ? '打印失败' : 'Print failed',
    secureWarn: zh ? '当前页面非 HTTPS，Web 蓝牙不可用。' : 'Web Bluetooth requires HTTPS.',
    unsupportedBle: zh ? '此浏览器不支持 Web 蓝牙。请用 Chrome/Edge。' : 'Web Bluetooth not supported. Use Chrome/Edge.',
  };
}

const MerchantPrinterModal: React.FC<MerchantPrinterModalProps> = ({
  open,
  language,
  storeName,
  storePhone,
  onClose,
}) => {
  const t = getCopy(language);
  const [settings, setSettings] = useState<WebPrinterSettings>(() => webPrinterService.getSettings());
  const [paperWidth, setPaperWidth] = useState<ReceiptPaperWidthMm>(() => loadReceiptPaperWidth());
  const [bleConnected, setBleConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const receipt = useMemo(
    () => createSampleReceiptData({ storeName, storePhone }),
    [storeName, storePhone, open],
  );

  const totals = useMemo(() => computeReceiptTotals(receipt), [receipt]);
  const itemDisplays = useMemo(
    () => buildReceiptItemDisplays(receipt.items, itemLabelForEscPos),
    [receipt],
  );

  const refreshBleState = useCallback(() => {
    setBleConnected(webPrinterService.isBluetoothConnected());
  }, []);

  useEffect(() => {
    if (!open) return;
    setSettings(webPrinterService.getSettings());
    setPaperWidth(loadReceiptPaperWidth());
    refreshBleState();
    setMessage('');
    void QRCode.toDataURL(receipt.orderId, { margin: 1, width: 120 }).then(setQrDataUrl);
  }, [open, receipt.orderId, refreshBleState]);

  const updateSettings = (patch: Partial<WebPrinterSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    const next: WebPrinterSettings = {
      ...settings,
      enabled: true,
      address:
        settings.type === 'wifi'
          ? `${settings.wifiHost}:${settings.wifiPort || 9100}`
          : settings.type === 'bluetooth'
            ? settings.address
            : '',
    };
    webPrinterService.saveSettings(next);
    saveReceiptPaperWidth(paperWidth);
    setMessage(t.saved);
  };

  const handleTab = (type: PrinterConnectionType) => {
    updateSettings({ type, enabled: true });
  };

  const handleConnectBle = async () => {
    if (!isWebBluetoothSupported()) {
      setMessage(t.unsupportedBle);
      return;
    }
    if (!isSecureContextForBluetooth()) {
      setMessage(t.secureWarn);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const device = await webPrinterService.connectBluetooth();
      updateSettings({
        type: 'bluetooth',
        enabled: true,
        address: device.id,
        bleDeviceName: device.name,
      });
      setBleConnected(true);
      setMessage(`${t.bleConnected}: ${device.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.printFail);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectBle = async () => {
    setBusy(true);
    try {
      await webPrinterService.disconnectBluetooth();
      setBleConnected(false);
      updateSettings({ bleDeviceName: '', address: '' });
    } finally {
      setBusy(false);
    }
  };

  const handleTestPrint = async () => {
    setBusy(true);
    setMessage('');
    try {
      handleSave();
      if (settings.type === 'wifi') {
        await testWifiBridge({ ...settings, enabled: true });
      } else {
        await webPrinterService.printSampleReceipt(storeName, storePhone);
      }
      setMessage(t.printOk);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.printFail);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const cachedBle = webPrinterService.getCachedBleDevice();
  const bleLabel = settings.bleDeviceName || cachedBle?.name || '';

  return (
    <div className="merchant-printer-overlay" onClick={onClose}>
      <div className="merchant-printer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="merchant-printer-header">
          <button type="button" className="merchant-printer-close" onClick={onClose}>✕</button>
          <h2>🖨️ {t.title}</h2>
          <p>{t.hint}</p>
        </div>

        <div className="merchant-printer-body">
          <div className="merchant-printer-tabs">
            {(['system', 'bluetooth', 'wifi'] as PrinterConnectionType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`merchant-printer-tab${settings.type === type ? ' active' : ''}`}
                onClick={() => handleTab(type)}
              >
                {type === 'system' ? t.tabSystem : type === 'bluetooth' ? t.tabBluetooth : t.tabWifi}
              </button>
            ))}
          </div>

          {settings.type === 'system' && (
            <div className="merchant-printer-section">
              <h3>{t.tabSystem}</h3>
              <p className="merchant-printer-note">
                {language === 'zh'
                  ? '使用电脑/平板系统打印对话框。若 Wi-Fi 打印机已添加到系统，可选该打印机输出。'
                  : 'Uses the system print dialog. Select your network printer if installed on this device.'}
              </p>
            </div>
          )}

          {settings.type === 'bluetooth' && (
            <div className="merchant-printer-section">
              <h3>{t.tabBluetooth}</h3>
              <p className="merchant-printer-note warn">{t.bleNote}</p>
              {!isWebBluetoothSupported() ? (
                <p className="merchant-printer-note warn">{t.unsupportedBle}</p>
              ) : null}
              {!isSecureContextForBluetooth() ? (
                <p className="merchant-printer-note warn">{t.secureWarn}</p>
              ) : null}
              <div className="merchant-printer-row">
                <span className={`merchant-printer-status ${bleConnected || bleLabel ? 'on' : 'off'}`}>
                  {bleConnected || bleLabel ? t.bleConnected : t.bleNotConnected}
                  {bleLabel ? ` · ${bleLabel}` : ''}
                </span>
              </div>
              <div className="merchant-printer-actions">
                <button type="button" className="merchant-printer-btn primary" disabled={busy} onClick={handleConnectBle}>
                  {t.connectBle}
                </button>
                <button type="button" className="merchant-printer-btn secondary" disabled={busy} onClick={handleDisconnectBle}>
                  {t.disconnectBle}
                </button>
              </div>
            </div>
          )}

          {settings.type === 'wifi' && (
            <div className="merchant-printer-section">
              <h3>{t.tabWifi}</h3>
              <p className="merchant-printer-note">{t.wifiBridgeHint}</p>
              <div className="merchant-printer-row">
                <span className="merchant-printer-label">{t.wifiHost}</span>
                <input
                  className="merchant-printer-input"
                  value={settings.wifiHost}
                  onChange={(e) => updateSettings({ wifiHost: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="merchant-printer-row">
                <span className="merchant-printer-label">{t.wifiPort}</span>
                <input
                  className="merchant-printer-input"
                  type="number"
                  value={settings.wifiPort}
                  onChange={(e) => updateSettings({ wifiPort: Number(e.target.value) || 9100 })}
                  placeholder="9100"
                />
              </div>
              <div className="merchant-printer-row">
                <span className="merchant-printer-label">{t.wifiBridge}</span>
                <input
                  className="merchant-printer-input"
                  value={settings.printBridgeUrl}
                  onChange={(e) => updateSettings({ printBridgeUrl: e.target.value })}
                  placeholder="http://localhost:9101/print"
                />
              </div>
            </div>
          )}

          <div className="merchant-printer-section">
            <h3>{t.paper}</h3>
            <p className="merchant-printer-note">{t.paperHint}</p>
            <select
              className="merchant-printer-select"
              value={paperWidth}
              onChange={(e) => setPaperWidth(Number(e.target.value) as ReceiptPaperWidthMm)}
            >
              {RECEIPT_PAPER_WIDTH_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {getReceiptPaperLabel(w, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="merchant-printer-section merchant-printer-toggle">
            <span>{t.autoPrint}</span>
            <input
              type="checkbox"
              checked={settings.autoPrint}
              onChange={(e) => updateSettings({ autoPrint: e.target.checked })}
            />
          </div>

          <div className="merchant-printer-section">
            <h3>{t.preview}</h3>
            <div
              className="merchant-printer-preview"
              style={{ maxWidth: `${paperWidth === 58 ? 220 : paperWidth === 80 ? 300 : 280}px` }}
            >
              <div style={{ textAlign: 'center', fontWeight: 900 }}>MARKET LINK EXPRESS</div>
              <div style={{ textAlign: 'center', fontSize: 11 }}>*** Merchant Copy ***</div>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, margin: '6px 0' }}>
                #{receipt.orderId.slice(-5)}
              </div>
              <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
              <div>Pay: Balance</div>
              {itemDisplays.map((d, i) => (
                <div key={`${d.lineText}-${i}`} className="item-line">
                  <span>{d.lineText}</span>
                  <span className={d.isSummary ? 'summary' : ''}>{d.amountText}</span>
                </div>
              ))}
              <div className="item-line">
                <span>Delivery</span>
                <span>{receipt.deliveryFee.toLocaleString()} MMK</span>
              </div>
              <div className="item-line summary">
                <span>TOTAL</span>
                <span>{totals.totalFee.toLocaleString()} MMK</span>
              </div>
              {qrDataUrl ? (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <img src={qrDataUrl} alt="QR" width={96} height={96} />
                </div>
              ) : null}
            </div>
          </div>

          {message ? <p className="merchant-printer-note" style={{ color: '#7dd3fc' }}>{message}</p> : null}
        </div>

        <div className="merchant-printer-footer">
          <button type="button" className="merchant-printer-btn secondary" onClick={onClose}>{t.close}</button>
          <button type="button" className="merchant-printer-btn secondary" disabled={busy} onClick={handleSave}>{t.save}</button>
          <button type="button" className="merchant-printer-btn primary full" disabled={busy} onClick={handleTestPrint}>
            {t.testPrint}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchantPrinterModal;
