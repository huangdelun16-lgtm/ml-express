import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './merchantApi/supabaseClient';
import LoggerService from './LoggerService';
import { getMerchantNetlifyBases } from './merchantAuthService';

export type ExportFormat = 'pdf' | 'excel';
export type ExportMethod = 'download' | 'email';
export type MerchantLanguage = 'zh' | 'en' | 'my';

export interface ExportStatementParams {
  storeId: string;
  storeName?: string;
  email?: string;
  startDate: string;
  endDate: string;
  format: ExportFormat;
  method: ExportMethod;
  language: MerchantLanguage;
}

export interface ExportStatementResult {
  ok: boolean;
  error?: string;
  noOrders?: boolean;
}

type StatementOrder = {
  id?: string;
  created_at?: string;
  sender_name?: string;
  receiver_name?: string;
  status?: string;
  price?: string | number;
  cod_amount?: number;
  payment_method?: string;
  cod_settled?: boolean;
};

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paymentLabel(method?: string): string {
  if (method === 'cash' || method === '现金支付') return '现金';
  if (method === 'qr') return '转账';
  return '余额';
}

function safeFileStem(storeName: string | undefined, startDate: string, endDate: string): string {
  const store = String(storeName || 'Merchant')
    .replace(/[^\w\u4e00-\u9fff\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  return `Statement_${store || 'Merchant'}_${startDate}_to_${endDate}`;
}

export function statementOrdersToCsv(orders: StatementOrder[]): string {
  const header = [
    '订单号',
    '下单时间',
    '寄件人',
    '收件人',
    '状态',
    '跑腿费',
    '代收金额',
    '支付方式',
    '结算状态',
  ];
  const lines = orders.map((pkg) =>
    [
      pkg.id,
      pkg.created_at ? new Date(pkg.created_at).toLocaleString() : '',
      pkg.sender_name,
      pkg.receiver_name,
      pkg.status,
      pkg.price,
      pkg.cod_amount || 0,
      paymentLabel(pkg.payment_method),
      pkg.cod_settled ? '已结算' : '待结算',
    ]
      .map(csvEscape)
      .join(','),
  );
  return `\uFEFF${[header.join(','), ...lines].join('\n')}`;
}

function statementOrdersToHtml(
  orders: StatementOrder[],
  storeName: string | undefined,
  startDate: string,
  endDate: string,
): string {
  const rows = orders
    .map(
      (pkg) => `<tr>
        <td>${escapeHtml(pkg.id)}</td>
        <td>${escapeHtml(pkg.created_at ? new Date(pkg.created_at).toLocaleString() : '')}</td>
        <td>${escapeHtml(pkg.sender_name)}</td>
        <td>${escapeHtml(pkg.receiver_name)}</td>
        <td>${escapeHtml(pkg.status)}</td>
        <td>${escapeHtml(pkg.price)}</td>
        <td>${escapeHtml(pkg.cod_amount || 0)}</td>
        <td>${escapeHtml(paymentLabel(pkg.payment_method))}</td>
        <td>${escapeHtml(pkg.cod_settled ? '已结算' : '待结算')}</td>
      </tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 16px; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p { font-size: 12px; color: #475569; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 5px; text-align: left; }
  th { background: #eef2ff; }
</style></head>
<body>
  <h1>结算对账单 · ${escapeHtml(storeName || 'Merchant')}</h1>
  <p>${escapeHtml(startDate)} — ${escapeHtml(endDate)}</p>
  <table>
    <thead><tr>
      <th>订单号</th><th>下单时间</th><th>寄件人</th><th>收件人</th>
      <th>状态</th><th>跑腿费</th><th>代收</th><th>支付</th><th>结算</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

async function writeCacheFile(name: string, contents: string, encoding: 'utf8' | 'base64') {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('no_cache');
  const path = `${dir}${name}`;
  await FileSystem.writeAsStringAsync(path, contents, {
    encoding:
      encoding === 'base64'
        ? FileSystem.EncodingType.Base64
        : FileSystem.EncodingType.UTF8,
  });
  return path;
}

async function shareFile(path: string, mimeType: string, uti: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('share_unavailable');
  }
  await Sharing.shareAsync(path, { mimeType, UTI: uti, dialogTitle: 'Export Statement' });
}

async function sendStatementByEmail(
  params: ExportStatementParams,
  fileData: string,
  fileName: string,
): Promise<void> {
  if (!params.email) {
    throw new Error('no_email');
  }
  let lastError = 'Email send failed';
  for (const baseUrl of getMerchantNetlifyBases()) {
    try {
      const response = await fetch(`${baseUrl}/.netlify/functions/send-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: params.email,
          storeName: params.storeName,
          startDate: params.startDate,
          endDate: params.endDate,
          fileData,
          fileName,
          format: params.format,
          language: params.language,
        }),
      });
      const result = await response.json();
      if (result.success) return;
      lastError = result.error || lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

export async function exportMerchantStatement(
  params: ExportStatementParams,
): Promise<ExportStatementResult> {
  try {
    const { data: orders, error } = await supabase
      .from('packages')
      .select('*')
      .eq('delivery_store_id', params.storeId)
      .gte('created_at', `${params.startDate}T00:00:00.000Z`)
      .lte('created_at', `${params.endDate}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!orders?.length) {
      return { ok: false, noOrders: true };
    }

    const fileStem = safeFileStem(params.storeName, params.startDate, params.endDate);

    if (params.format === 'excel') {
      const csv = statementOrdersToCsv(orders);
      const fileName = `${fileStem}.csv`;
      const path = await writeCacheFile(fileName, csv, 'utf8');
      if (params.method === 'download') {
        await shareFile(path, 'text/csv', 'public.comma-separated-values-text');
      } else {
        const base64 = await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await sendStatementByEmail(
          params,
          `data:text/csv;base64,${base64}`,
          fileName,
        );
      }
      return { ok: true };
    }

    const html = statementOrdersToHtml(
      orders,
      params.storeName,
      params.startDate,
      params.endDate,
    );
    const printed = await Print.printToFileAsync({ html, base64: true });
    const fileName = `${fileStem}.pdf`;
    if (params.method === 'download') {
      await shareFile(printed.uri, 'application/pdf', 'com.adobe.pdf');
    } else {
      const base64 =
        printed.base64 ||
        (await FileSystem.readAsStringAsync(printed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        }));
      await sendStatementByEmail(
        params,
        `data:application/pdf;base64,${base64}`,
        fileName,
      );
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network';
    LoggerService.error('导出对账单失败:', err);
    if (message === 'no_email') return { ok: false, error: 'no_email' };
    if (message === 'share_unavailable') return { ok: false, error: 'share_unavailable' };
    return { ok: false, error: 'network' };
  }
}
