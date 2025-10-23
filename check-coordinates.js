const { createClient } = require('@supabase/supabase-js');

// 使用您的Supabase配置
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoordinates() {
  try {
    console.log('🔍 检查数据库中的经纬度数据...');
    
    // 查询最近的包裹数据
    const { data, error } = await supabase
      .from('packages')
      .select('id, sender_address, sender_latitude, sender_longitude, receiver_address, receiver_latitude, receiver_longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    console.log(`📦 查询到 ${data.length} 个包裹:`);
    
    data.forEach((pkg, index) => {
      console.log(`\n${index + 1}. 包裹ID: ${pkg.id}`);
      console.log(`   创建时间: ${pkg.created_at}`);
      console.log(`   寄件地址: ${pkg.sender_address}`);
      console.log(`   寄件坐标: ${pkg.sender_latitude ? `${pkg.sender_latitude}, ${pkg.sender_longitude}` : '❌ 无坐标'}`);
      console.log(`   收件地址: ${pkg.receiver_address}`);
      console.log(`   收件坐标: ${pkg.receiver_latitude ? `${pkg.receiver_latitude}, ${pkg.receiver_longitude}` : '❌ 无坐标'}`);
    });
    
    // 统计有坐标的包裹数量
    const withSenderCoords = data.filter(pkg => pkg.sender_latitude && pkg.sender_longitude).length;
    const withReceiverCoords = data.filter(pkg => pkg.receiver_latitude && pkg.receiver_longitude).length;
    
    console.log(`\n📊 统计结果:`);
    console.log(`   有寄件坐标的包裹: ${withSenderCoords}/${data.length}`);
    console.log(`   有收件坐标的包裹: ${withReceiverCoords}/${data.length}`);
    
  } catch (err) {
    console.error('❌ 检查失败:', err);
  }
}

checkCoordinates();
