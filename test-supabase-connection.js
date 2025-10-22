// 简单测试Supabase连接
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cabtgyzmokewrgkxjgvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYnRneXptb2tld3Jna3hqZ3ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMyMDI5MywiZXhwIjoyMDcwODk2MjkzfQ.q6YoGdgsOKc2QY4bdXkabyJUxzY4n5HswVJCkZsSq7o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 测试Supabase连接...');
  
  try {
    // 测试基本连接
    const { data, error } = await supabase
      .from('packages')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase连接失败:', error);
      return;
    }

    console.log('✅ Supabase连接成功');

    // 测试verification_codes表
    const { data: codesData, error: codesError } = await supabase
      .from('verification_codes')
      .select('id')
      .limit(1);

    if (codesError) {
      console.error('❌ verification_codes表不存在:', codesError.message);
      console.log('💡 需要在Supabase中创建verification_codes表');
      return;
    }

    console.log('✅ verification_codes表存在');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testConnection();
