// SMS Verification Service - 前端版本
// 通过 Netlify Functions 发送短信

/**
 * 发送短信验证码到缅甸手机号
 * @param phoneNumber - 缅甸手机号（格式：09xxxxxxxx）
 * @param language - 语言代码（'zh', 'en', 'my'）
 * @returns Promise<{ success: boolean; message: string; code?: string }>
 */
export async function sendVerificationCode(
  phoneNumber: string,
  language: 'zh' | 'en' | 'my' = 'zh'
): Promise<{ success: boolean; message: string; code?: string }> {
  try {
    // 验证手机号格式
    const phoneRegex = /^09\d{7,9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return {
        success: false,
        message: language === 'zh' ? '无效的手机号格式' : 
                 language === 'en' ? 'Invalid phone number format' : 
                 'ဖုန်းနံပါတ် မမှန်ကန်ပါ'
      };
    }

    console.log(`📱 正在发送验证码到: ${phoneNumber}`);

    // 调用 Netlify Function
    const response = await fetch('/.netlify/functions/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber,
        language
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Network error');
    }

    console.log('✅ 验证码发送成功:', result);

    return {
      success: result.success,
      message: result.message,
      code: result.code // 仅开发模式返回
    };

  } catch (error: any) {
    console.error('❌ 发送短信失败:', error);
    
    return {
      success: false,
      message: language === 'zh' ? '发送失败，请稍后重试' : 
               language === 'en' ? 'Failed to send, please try again later' : 
               'ပို့ဆောင်မှု မအောင်မြင်ပါ'
    };
  }
}

/**
 * 验证验证码是否正确
 * @param phoneNumber - 手机号
 * @param code - 用户输入的验证码
 * @param language - 语言代码
 * @returns Promise<{ success: boolean; message: string }>
 */
export async function verifyCode(
  phoneNumber: string,
  code: string,
  language: 'zh' | 'en' | 'my' = 'zh'
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🔍 正在验证验证码: ${phoneNumber} - ${code}`);

    // 调用 Netlify Function
    const response = await fetch('/.netlify/functions/verify-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber,
        code,
        language
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Network error');
    }

    console.log('✅ 验证码验证结果:', result);

    return result;

  } catch (error: any) {
    console.error('❌ 验证码验证失败:', error);
    
    return {
      success: false,
      message: language === 'zh' ? '验证失败，请重试' : 
               language === 'en' ? 'Verification failed, please try again' : 
               'အတည်ပြုခြင်း မအောင်မြင်ပါ'
    };
  }
}

// 添加别名以保持向后兼容
export const verifyVerificationCode = verifyCode;

export default {
  sendVerificationCode,
  verifyCode,
  verifyVerificationCode
};
