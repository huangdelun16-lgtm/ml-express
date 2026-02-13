import LoggerService from './LoggerService';

// 简化的短信验证服务（客户端版本）
// 注意：实际的验证码验证应该通过 Netlify Function 或后端 API 完成

export interface VerificationResult {
  success: boolean;
  message: string;
  code?: string; // 开发模式可能会返回验证码
}

// 发送短信验证码（简化版 - 客户端不直接发送，应通过后端）
export async function sendVerificationCode(
  phone: string,
  language: 'zh' | 'en' = 'zh'
): Promise<VerificationResult> {
  try {
    // 客户端版本：调用 Netlify Function 发送验证码
    const response = await fetch('/.netlify/functions/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, language })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        message: language === 'zh' ? '验证码已发送到您的手机' : 
                 language === 'en' ? 'Verification code sent to your phone' :
                 'အတည်ပြုကုဒ် ပို့ပြီးပါပြီ',
        code: result.code // 开发模式可能会返回验证码
      };
    } else {
      return {
        success: false,
        message: result.message || (language === 'zh' ? '发送验证码失败' : 
                 language === 'en' ? 'Failed to send verification code' :
                 'အတည်ပြုကုဒ် ပို့ခြင်း မအောင်မြင်ပါ')
      };
    }
  } catch (error) {
    LoggerService.error('发送验证码失败:', error);
    return {
      success: false,
      message: language === 'zh' ? '发送验证码失败，请稍后重试' : 
               language === 'en' ? 'Failed to send verification code, please try again later' :
               'အတည်ပြုကုဒ် ပို့ခြင်း မအောင်မြင်ပါ၊ နောက်မှ ထပ်စမ်းကြည့်ပါ'
    };
  }
}

// 验证短信验证码（简化版）
export async function verifyVerificationCode(
  phone: string,
  code: string,
  language: 'zh' | 'en' = 'zh'
): Promise<VerificationResult> {
  try {
    // 客户端版本：调用 Netlify Function 验证验证码
    const response = await fetch('/.netlify/functions/verify-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, language })
    });
    
    const result = await response.json();
    LoggerService.debug('短信验证 API 返回结果:', result);
    
    if (result.success === true || result.valid === true) {
      return {
        success: true,
        message: result.message || (language === 'zh' ? '验证码正确' : 
                 language === 'en' ? 'Verification code is correct' :
                 'အတည်ပြုကုဒ် မှန်ကန်ပါသည်')
      };
    } else {
      return {
        success: false,
        message: result.message || (language === 'zh' ? '验证码错误或已过期' : 
                 language === 'en' ? 'Invalid or expired verification code' :
                 'အတည်ပြုကုဒ် မှားနေပါသည် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ')
      };
    }
  } catch (error) {
    LoggerService.error('验证验证码失败:', error);
    return {
      success: false,
      message: language === 'zh' ? '验证失败，请稍后重试' : 
               language === 'en' ? 'Verification failed, please try again later' :
               'အတည်ပြုခြင်း မအောင်မြင်ပါ၊ နောက်မှ ထပ်စမ်းကြည့်ပါ'
    };
  }
}

