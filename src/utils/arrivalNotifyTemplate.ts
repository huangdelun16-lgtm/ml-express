export const ARRIVAL_NOTIFY_TEMPLATE_KEY = 'inventory.arrival_notify.template';

/** 未在后台保存时，库存 App 仍用内置的中/英/缅文。保存后各语言都用这一段。 */
export const DEFAULT_ARRIVAL_NOTIFY_TEMPLATE =
  '【ML Express】{name}您好，包裹已到达{hub}站，单号 {barcode}，快递单 {express}，请凭有效证件前来取件。';

export type ArrivalNotifyTemplateFields = {
  name?: string;
  hub?: string;
  barcode?: string;
  express?: string;
};

export function parseArrivalNotifyTemplate(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === 'string') return parsed.trim();
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/** 把 {name} {hub} {barcode} {express} 填进模板。姓名或快递单为空时，去掉对应的称呼和「快递单」。 */
export function renderArrivalNotifyTemplate(
  template: string,
  fields: ArrivalNotifyTemplateFields,
): string {
  const name = String(fields.name ?? '').trim();
  const hub = String(fields.hub ?? '').trim();
  const barcode = String(fields.barcode ?? '').trim();
  const express = String(fields.express ?? '').trim();
  let text = template;
  if (!name) {
    text = text.replace(/\{name\}您好，/g, '').replace(/\{name\}您好,/g, '').replace(/\{name\}/g, '');
  } else {
    text = text.replace(/\{name\}/g, name);
  }
  if (!express) {
    text = text.replace(/[，,]\s*快递单\s*\{express\}/g, '');
    text = text.replace(/\{express\}/g, '');
  } else {
    text = text.replace(/\{express\}/g, express);
  }
  text = text.replace(/\{hub\}/g, hub).replace(/\{barcode\}/g, barcode);
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/，{2,}/g, '，')
    .replace(/,{2,}/g, ',')
    .trim();
}
