// 测试邮箱验证码发送和验证
const fetch = require('node-fetch');

const BASE_URL = 'https://market-link-express.com';

async function testEmailVerification() {
  console.log('🧪 开始测试邮箱验证码功能...\n');
  
  const testEmail = 'test@example.com';
  
  try {
    // 1. 发送验证码
    console.log('📧 发送验证码到:', testEmail);
    const sendResponse = await fetch(`${BASE_URL}/.netlify/functions/send-email-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        language: 'zh'
      })
    });
    
    const sendResult = await sendResponse.json();
    console.log('发送结果:', sendResult);
    
    if (sendResult.success && sendResult.code) {
      const verificationCode = sendResult.code;
      console.log('✅ 验证码发送成功:', verificationCode);
      
      // 2. 验证验证码
      console.log('\n🔍 验证验证码:', verificationCode);
      const verifyResponse = await fetch(`${BASE_URL}/.netlify/functions/verify-email-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          code: verificationCode,
          language: 'zh'
        })
      });
      
      const verifyResult = await verifyResponse.json();
      console.log('验证结果:', verifyResult);
      
      if (verifyResult.success) {
        console.log('✅ 验证码验证成功！');
      } else {
        console.log('❌ 验证码验证失败:', verifyResult.message);
      }
    } else {
      console.log('❌ 验证码发送失败:', sendResult.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testEmailVerification();
