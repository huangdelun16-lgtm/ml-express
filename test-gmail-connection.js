// 测试Gmail连接
const nodemailer = require('nodemailer');

async function testGmailConnection() {
  console.log('🧪 测试Gmail连接...');
  
  const gmailUser = 'aungmyatthu259369349@gmail.com';
  const gmailPass = 'mkvh tzoi nqlm ftzd';
  
  try {
    // 创建传输器
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    
    // 验证连接
    console.log('🔍 验证Gmail连接...');
    await transporter.verify();
    console.log('✅ Gmail连接验证成功！');
    
    // 发送测试邮件
    console.log('📧 发送测试邮件...');
    const info = await transporter.sendMail({
      from: `"Myanmar Express" <${gmailUser}>`,
      to: 'marketlink982@gmail.com',
      subject: '测试邮件 - Myanmar Express',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">测试邮件</h2>
          <p>这是一封测试邮件，用于验证Gmail配置是否正确。</p>
          <p>如果您收到这封邮件，说明Gmail配置正常。</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Myanmar Express Team</p>
        </div>
      `
    });
    
    console.log('✅ 测试邮件发送成功！');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Gmail连接失败:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('💡 建议：Gmail应用密码可能无效，请重新生成');
    } else if (error.message.includes('Less secure app access')) {
      console.log('💡 建议：需要启用"允许不够安全的应用"');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 建议：检查Gmail用户名和密码');
    }
  }
}

testGmailConnection();
