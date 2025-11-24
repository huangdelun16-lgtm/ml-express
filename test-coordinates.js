const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// 测试包裹经纬度数据
const testPackageCoordinates = async () => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('id, sender_address, sender_latitude, sender_longitude, receiver_address, receiver_latitude, receiver_longitude, courier')
      .limit(5);
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    console.log('📦 包裹经纬度数据测试结果:');
    data.forEach(pkg => {
      console.log(`包裹 ${pkg.id}:`);
      console.log(`  寄件地址: ${pkg.sender_address}`);
      console.log(`  寄件坐标: ${pkg.sender_latitude ? `${pkg.sender_latitude}, ${pkg.sender_longitude}` : '无'}`);
      console.log(`  收件地址: ${pkg.receiver_address}`);
      console.log(`  收件坐标: ${pkg.receiver_latitude ? `${pkg.receiver_latitude}, ${pkg.receiver_longitude}` : '无'}`);
      console.log(`  分配骑手: ${pkg.courier || '未分配'}`);
      console.log('---');
    });
  } catch (err) {
    console.error('❌ 测试异常:', err);
  }
};

// 运行测试
testPackageCoordinates();
