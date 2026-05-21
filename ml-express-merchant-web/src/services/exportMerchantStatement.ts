import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import LoggerService from './LoggerService';
import type { MerchantLanguage } from '../constants/merchantOrderStatus';

export type ExportFormat = 'pdf' | 'excel';
export type ExportMethod = 'download' | 'email';

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

async function sendStatementByEmail(
  params: ExportStatementParams,
  fileData: string,
  fileName: string,
): Promise<void> {
  const response = await fetch('/.netlify/functions/send-statement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }
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

    const fileName = `Statement_${params.storeName || 'Merchant'}_${params.startDate}_to_${params.endDate}`;

    if (params.format === 'excel') {
      const worksheetData = orders.map((pkg) => ({
        订单号: pkg.id,
        下单时间: new Date(pkg.created_at).toLocaleString(),
        寄件人: pkg.sender_name,
        收件人: pkg.receiver_name,
        状态: pkg.status,
        跑腿费: pkg.price,
        代收金额: pkg.cod_amount || 0,
        支付方式: pkg.payment_method === 'cash' ? '现金' : '余额',
        结算状态: pkg.cod_settled ? '已结算' : '待结算',
      }));
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');

      if (params.method === 'download') {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const base64Data = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
        await sendStatementByEmail(params, base64Data, `${fileName}.xlsx`);
      }
      return { ok: true };
    }

    try {
      const doc = new jsPDF();
      const displayStoreName = (params.storeName || 'Merchant').replace(
        /[^\x00-\x7F]/g,
        '*',
      );
      doc.setFontSize(18);
      doc.text(`Statement: ${displayStoreName}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Period: ${params.startDate} to ${params.endDate}`, 14, 30);

      const tableRows = orders.map((pkg) => [
        pkg.id.slice(-8),
        new Date(pkg.created_at).toLocaleDateString(),
        (pkg.receiver_name || '').replace(/[^\x00-\x7F]/g, '*'),
        (pkg.status || '').replace(/[^\x00-\x7F]/g, '*'),
        pkg.price,
        pkg.cod_amount || 0,
        pkg.cod_settled ? 'Yes' : 'No',
      ]);

      (doc as any).autoTable({
        head: [['ID', 'Date', 'Receiver', 'Status', 'Price', 'COD', 'Settled']],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica' },
      });

      if (params.method === 'download') {
        doc.save(`${fileName}.pdf`);
      } else {
        const pdfBase64 = doc.output('datauristring');
        await sendStatementByEmail(params, pdfBase64, `${fileName}.pdf`);
      }
      return { ok: true };
    } catch (pdfErr) {
      LoggerService.error('PDF export failed', pdfErr);
      return {
        ok: false,
        error: 'pdf_unicode',
      };
    }
  } catch (err) {
    LoggerService.error('导出对账单失败:', err);
    return { ok: false, error: 'network' };
  }
}
