// SMS Verification Service using Twilio
import twilio from 'twilio';

// Twilio 配置（从环境变量读取）
const TWILIO_ACCOUNT_SID = process.env.REACT_APP_TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.REACT_APP_TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.REACT_APP_TWILIO_PHONE_NUMBER || '';

// 初始化 Twilio 客户端
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN 
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

// 存储验证码（生产环境应使用数据库或 Redis）
const verificationCodes = new Map<string, { code: string; expires: number }>();

/**
 * 生成6位随机验证码
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // 检查 Twilio 配置
    if (!twilioClient) {
      console.error('Twilio 未配置');
      // 开发模式：返回固定验证码
      const devCode = '123456';
      console.log(`📱 开发模式验证码: ${devCode} (手机号: ${phoneNumber})`);
      
      verificationCodes.set(phoneNumber, {
        code: devCode,
        expires: Date.now() + 5 * 60 * 1000 // 5分钟有效期
      });
      
      return {
        success: true,
        message: language === 'zh' ? '验证码已发送（开发模式）' : 
                 language === 'en' ? 'Verification code sent (Dev mode)' : 
                 'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ',
        code: devCode // 开发模式返回验证码
      };
    }

    // 生成验证码
    const code = generateVerificationCode();
    
    // 构建短信内容（多语言）
    let messageText = '';
    if (language === 'zh') {
      messageText = `【缅甸同城快递】您的验证码是：${code}，5分钟内有效。请勿泄露给他人。`;
    } else if (language === 'en') {
      messageText = `[Myanmar Express] Your verification code is: ${code}. Valid for 5 minutes. Do not share with others.`;
    } else {
      messageText = `[Myanmar Express] သင့်အတည်ပြုကုဒ်မှာ: ${code} ဖြစ်ပါသည်။ ၅ မိနစ်အတွင်း အသုံးပြုပါ။`;
    }

    // 发送短信（缅甸手机号需要加国际区号 +95）
    const internationalPhone = phoneNumber.replace(/^0/, '+95');
    
    console.log(`📱 正在发送验证码到: ${internationalPhone}`);
    
    const message = await twilioClient.messages.create({
      body: messageText,
      from: TWILIO_PHONE_NUMBER,
      to: internationalPhone
    });

    console.log(`✅ 短信发送成功，SID: ${message.sid}`);

    // 存储验证码（5分钟有效期）
    verificationCodes.set(phoneNumber, {
      code: code,
      expires: Date.now() + 5 * 60 * 1000
    });

    return {
      success: true,
      message: language === 'zh' ? '验证码已发送，请查收短信' : 
               language === 'en' ? 'Verification code sent, please check your SMS' : 
               'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ၊ SMS စစ်ဆေးပါ'
    };
  } catch (error: any) {
    console.error('发送短信失败:', error);
    
    // 错误处理
    let errorMessage = '';
    if (error.code === 21211) {
      errorMessage = language === 'zh' ? '无效的手机号' : 
                     language === 'en' ? 'Invalid phone number' : 
                     'ဖုန်းနံပါတ် မမှန်ကန်ပါ';
    } else if (error.code === 21608) {
      errorMessage = language === 'zh' ? '该号码无法接收短信' : 
                     language === 'en' ? 'This number cannot receive SMS' : 
                     'ဤနံပါတ်သည် SMS လက်ရှိမရနိုင်ပါ';
    } else {
      errorMessage = language === 'zh' ? '发送失败，请稍后重试' : 
                     language === 'en' ? 'Failed to send, please try again later' : 
                     'ပို့ဆောင်မှု မအောင်မြင်ပါ၊ နောက်တစ်ခေါက်ကြိုးစားပါ';
    }

    return {
      success: false,
      message: errorMessage
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
  const stored = verificationCodes.get(phoneNumber);

  if (!stored) {
    return {
      success: false,
      message: language === 'zh' ? '验证码不存在或已过期' : 
               language === 'en' ? 'Verification code does not exist or has expired' : 
               'အတည်ပြုကုဒ်မရှိပါ သို့မဟုတ် သက်တမ်းကုန်ပါပြီ'
    };
  }

  // 检查是否过期
  if (Date.now() > stored.expires) {
    verificationCodes.delete(phoneNumber);
    return {
      success: false,
      message: language === 'zh' ? '验证码已过期，请重新获取' : 
               language === 'en' ? 'Verification code expired, please request a new one' : 
               'အတည်ပြုကုဒ် သက်တမ်းကုန်ပါပြီ၊ ပြန်လည်ရယူပါ'
    };
  }

  // 验证码匹配
  if (stored.code === code) {
    verificationCodes.delete(phoneNumber);
    return {
      success: true,
      message: language === 'zh' ? '验证成功' : 
               language === 'en' ? 'Verification successful' : 
               'အတည်ပြုခြင်း အောင်မြင်ပါသည်'
    };
  }

  return {
    success: false,
    message: language === 'zh' ? '验证码错误' : 
             language === 'en' ? 'Incorrect verification code' : 
             'အတည်ပြုကုဒ် မှားယွင်းနေပါသည်'
  };
}

/**
 * 清除过期的验证码（定时任务）
 */
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [phone, data] of verificationCodes.entries()) {
    if (now > data.expires) {
      verificationCodes.delete(phone);
      console.log(`🗑️ 清除过期验证码: ${phone}`);
    }
  }
}

// 每分钟清理一次过期验证码
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCodes, 60 * 1000);
}

export default {
  sendVerificationCode,
  verifyCode,
  cleanupExpiredCodes
};

