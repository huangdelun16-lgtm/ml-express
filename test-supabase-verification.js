// 测试Supabase连接和verification_codes表
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cabtgyzmokewrgkxjgvg.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🧪 测试Supabase连接...');
  
  try {
    // 测试连接
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ verification_codes表不存在:', error.message);
      
      // 尝试创建表
      console.log('🔧 尝试创建verification_codes表...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS verification_codes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.log('❌ 无法创建表:', createError.message);
        console.log('💡 请在Supabase Dashboard中手动创建verification_codes表');
      } else {
        console.log('✅ verification_codes表创建成功');
      }
    } else {
      console.log('✅ verification_codes表存在，数据:', data);
    }
    
    // 测试插入验证码
    console.log('\n🧪 测试插入验证码...');
    const testEmail = 'test@example.com';
    const testCode = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    // 删除旧验证码
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', testEmail);
    
    // 插入新验证码
    const { data: insertData, error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email: testEmail,
        code: testCode,
        expires_at: expiresAt,
        used: false
      })
      .select();
    
    if (insertError) {
      console.log('❌ 插入验证码失败:', insertError.message);
    } else {
      console.log('✅ 验证码插入成功:', insertData);
    }
    
    // 测试查询验证码
    console.log('\n🧪 测试查询验证码...');
    const { data: queryData, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', testEmail)
      .eq('code', testCode)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (queryError) {
      console.log('❌ 查询验证码失败:', queryError.message);
    } else {
      console.log('✅ 验证码查询成功:', queryData);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSupabase();
