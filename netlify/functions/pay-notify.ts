import type { Handler, HandlerEvent } from '@netlify/functions';

// 发送短信：优先调用自定义 Webhook，其次回退到 textbelt 测试网关（每日额度极低，仅作占位）。
const sendSMS = async (phone: string, message: string) => {
  const webhook = process.env.SMS_WEBHOOK_URL;
  const webhookKey = process.env.SMS_WEBHOOK_KEY || '';
  if (webhook) {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(webhookKey ? { 'x-webhook-key': webhookKey } : {}) },
      body: JSON.stringify({ phone, message })
    });
    if (!r.ok) {
      const text = await r.text().catch(()=>'');
      throw new Error(`SMS webhook error: ${r.status} ${text}`);
    }
    return await r.json().catch(()=>({ ok: true }));
  }
  // fallback: textbelt (不保证覆盖缅甸，且额度极低)
  const r = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ phone, message, key: process.env.TEXTBELT_KEY || 'textbelt' }) as any,
  });
  return await r.json();
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } } as any;
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const data = JSON.parse(event.body || '{}');
    const phone = String(data.phone || '').trim();
    const tracking = String(data.trackingNumber || '').trim();
    if (!phone || !tracking) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'phone/trackingNumber required' }) };
    }
    const message = data.message || `您的订单已提交并完成预定费支付，单号：${tracking}。我们将尽快为您安排取件与配送。感谢支持！`;
    const smsRes = await sendSMS(phone, message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, sms: smsRes })
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e?.message || 'Server error' }) };
  }
};


