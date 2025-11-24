// 测试Supabase verification_codes表
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cabtgyzmokewrgkxjgvg.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVerificationCodes() {
  console.log('🧪 测试Supabase verification_codes表...');
  
  try {
    // 检查表是否存在
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from('verification_codes')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.error('❌ verification_codes表不存在或有问题:', tableCheckError);
      return;
    }

    console.log('✅ verification_codes表存在');

    // 查询最近的验证码
    const { data: recentCodes, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', 'marketlink982@gmail.com')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ 查询验证码失败:', queryError);
      return;
    }

    console.log('📧 marketlink982@gmail.com的验证码记录:');
    if (recentCodes && recentCodes.length > 0) {
      recentCodes.forEach((code, index) => {
        console.log(`${index + 1}. 验证码: ${code.code}, 过期时间: ${code.expires_at}, 已使用: ${code.used}`);
      });
    } else {
      console.log('⚠️ 没有找到验证码记录');
    }

    // 查询所有验证码（最近10条）
    const { data: allCodes, error: allError } = await supabase
      .from('verification_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ 查询所有验证码失败:', allError);
      return;
    }

    console.log('\n📋 最近的验证码记录（所有邮箱）:');
    if (allCodes && allCodes.length > 0) {
      allCodes.forEach((code, index) => {
        console.log(`${index + 1}. 邮箱: ${code.email}, 验证码: ${code.code}, 过期时间: ${code.expires_at}, 已使用: ${code.used}`);
      });
    } else {
      console.log('⚠️ 没有任何验证码记录');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testVerificationCodes();
