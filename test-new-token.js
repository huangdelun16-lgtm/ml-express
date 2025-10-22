const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'sbp_88c4d0468a7336f3a1cab4e6a61362dd5d354f90';

const supabase = createClient(supabaseUrl, supabaseKey);

// 测试新的Supabase token
const testNewToken = async () => {
  try {
    console.log('🔑 测试新的Supabase token...');
    
    // 测试连接
    const { data, error } = await supabase
      .from('packages')
      .select('id, status, courier')
      .limit(3);
    
    if (error) {
      console.error('❌ Token测试失败:', error);
      return false;
    }
    
    console.log('✅ Token测试成功!');
    console.log('📦 获取到的包裹数据:', data.length, '条');
    data.forEach(pkg => {
      console.log(`  - ${pkg.id}: ${pkg.status} (${pkg.courier || '未分配'})`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Token测试异常:', err);
    return false;
  }
};

// 运行测试
testNewToken().then(success => {
  if (success) {
    console.log('🎉 新Token工作正常，可以安全使用！');
  } else {
    console.log('⚠️ 新Token有问题，建议检查配置！');
  }
});
