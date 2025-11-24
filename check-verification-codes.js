// 检查Supabase verification_codes表的内容
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cabtgyzmokewrgkxjgvg.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVerificationCodes() {
  console.log('🔍 检查Supabase verification_codes表...');
  
  try {
    // 查询所有验证码记录
    const { data: allCodes, error: allError } = await supabase
      .from('verification_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ 查询失败:', allError);
      return;
    }

    console.log('📋 最近的验证码记录:');
    if (allCodes && allCodes.length > 0) {
      allCodes.forEach((code, index) => {
        const createdAt = new Date(code.created_at).toLocaleString('zh-CN');
        const expiresAt = new Date(code.expires_at).toLocaleString('zh-CN');
        console.log(`${index + 1}. 邮箱: ${code.email}`);
        console.log(`   验证码: ${code.code}`);
        console.log(`   创建时间: ${createdAt}`);
        console.log(`   过期时间: ${expiresAt}`);
        console.log(`   已使用: ${code.used}`);
        console.log('   ---');
      });
    } else {
      console.log('⚠️ 没有任何验证码记录');
    }

    // 查询marketlink982@gmail.com的记录
    const { data: userCodes, error: userError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', 'marketlink982@gmail.com')
      .order('created_at', { ascending: false })
      .limit(5);

    if (userError) {
      console.error('❌ 查询用户验证码失败:', userError);
      return;
    }

    console.log('\n📧 marketlink982@gmail.com的验证码记录:');
    if (userCodes && userCodes.length > 0) {
      userCodes.forEach((code, index) => {
        const createdAt = new Date(code.created_at).toLocaleString('zh-CN');
        const expiresAt = new Date(code.expires_at).toLocaleString('zh-CN');
        console.log(`${index + 1}. 验证码: ${code.code}`);
        console.log(`   创建时间: ${createdAt}`);
        console.log(`   过期时间: ${expiresAt}`);
        console.log(`   已使用: ${code.used}`);
        console.log('   ---');
      });
    } else {
      console.log('⚠️ 没有找到marketlink982@gmail.com的验证码记录');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkVerificationCodes();
