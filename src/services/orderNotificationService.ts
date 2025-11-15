export interface OrderConfirmationPayload {
  email: string;
  language?: 'zh' | 'en' | 'my';
  orderId: string;
  qrCodeDataUrl: string;
  customerName?: string;
  price?: number | string;
  distance?: number | string;
  senderName?: string;
  receiverName?: string;
  deliverySpeed?: string;
  orderTime?: string;
}

export interface OrderConfirmationResponse {
  success: boolean;
  message?: string;
  isDevelopmentMode?: boolean;
  error?: string;
}

const DEFAULT_ENDPOINT = 'https://market-link-express.com/.netlify/functions/send-order-confirmation';

function getEndpoint(): string {
  const envEndpoint = process.env.REACT_APP_ORDER_CONFIRMATION_ENDPOINT;
  if (envEndpoint && envEndpoint.trim()) {
    return envEndpoint.trim();
  }

  const baseUrl = process.env.REACT_APP_NETLIFY_BASE_URL;
  if (baseUrl && baseUrl.trim()) {
    return `${baseUrl.replace(/\/$/, '')}/.netlify/functions/send-order-confirmation`;
  }

  return DEFAULT_ENDPOINT;
}

/**
 * 发送订单确认邮件
 */
export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationPayload
): Promise<OrderConfirmationResponse> {
  try {
    const endpoint = getEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      return {
        success: false,
        message:
          result?.error ||
          result?.message ||
          (payload.language === 'en'
            ? 'Failed to send order confirmation email.'
            : payload.language === 'my'
            ? 'အော်ဒါအတည်ပြုအီးမေးလ် ပို့ရာတွင် မအောင်မြင်ပါ။'
            : '发送订单确认邮件失败。')
      };
    }

    return result as OrderConfirmationResponse;
  } catch (error) {
    console.error('发送订单确认邮件失败:', error);
    return {
      success: false,
      message:
        payload.language === 'en'
          ? 'Network error while sending order confirmation email.'
          : payload.language === 'my'
          ? 'အော်ဒါအတည်ပြုအီးမေးလ် ပို့ရာတွင် ကွန်ရက် ပြဿနာဖြစ်နေပါသည်။'
          : '发送订单确认邮件时发生网络错误。'
    };
  }
}

export default {
  sendOrderConfirmationEmail
};


