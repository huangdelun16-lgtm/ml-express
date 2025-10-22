// Email Verification Service - 前端版本
// 通过 Netlify Functions 发送邮件验证码

/**
 * 发送邮箱验证码
 * @param email - 邮箱地址
 * @param language - 语言代码（'zh', 'en', 'my'）
 * @returns Promise<{ success: boolean; message: string; code?: string }>
 */
export async function sendEmailVerificationCode(
  email: string,
  language: 'zh' | 'en' | 'my' = 'zh'
): Promise<{ success: boolean; message: string; code?: string }> {
  try {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: language === 'zh' ? '无效的邮箱格式' : 
                 language === 'en' ? 'Invalid email format' : 
                 'အီးမေးလ်ပုံစံ မမှန်ကန်ပါ'
      };
    }

    console.log(`📧 正在发送验证码到: ${email}`);

    // 调用 Netlify Function
    const response = await fetch('https://market-link-express.com/.netlify/functions/send-email-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
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
    console.error('❌ 发送邮件失败:', error);
    
    return {
      success: false,
      message: language === 'zh' ? '发送失败，请稍后重试' : 
               language === 'en' ? 'Failed to send, please try again later' : 
               'ပို့ဆောင်မှု မအောင်မြင်ပါ'
    };
  }
}

/**
 * 验证邮箱验证码是否正确
 * @param email - 邮箱地址
 * @param code - 用户输入的验证码
 * @param language - 语言代码
 * @returns Promise<{ success: boolean; message: string }>
 */
export async function verifyEmailCode(
  email: string,
  code: string,
  language: 'zh' | 'en' | 'my' = 'zh'
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🔍 正在验证验证码: ${email} - ${code}`);

    // 调用 Netlify Function
    const response = await fetch('https://market-link-express.com/.netlify/functions/verify-email-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
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

// 添加别名以保持一致性
export const verifyEmailVerificationCode = verifyEmailCode;

export default {
  sendEmailVerificationCode,
  verifyEmailCode,
  verifyEmailVerificationCode
};

