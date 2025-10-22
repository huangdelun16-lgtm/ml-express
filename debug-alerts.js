const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uopkyuluxnrewvlmutam.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY'
);

// 计算距离函数
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function debugAlerts() {
  console.log('🔍 调试配送警报问题...\n');
  
  // 1. 检查最近的已送达包裹
  console.log('1️⃣ 检查最近的已送达包裹:');
  const { data: packages } = await supabase
    .from('packages')
    .select('id, receiver_latitude, receiver_longitude, courier, delivery_time')
    .eq('status', '已送达')
    .order('delivery_time', { ascending: false })
    .limit(5);
    
  if (packages && packages.length > 0) {
    packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.id} - ${pkg.courier} - ${pkg.delivery_time}`);
      console.log(`      坐标: ${pkg.receiver_latitude}, ${pkg.receiver_longitude}`);
    });
  } else {
    console.log('   ⚠️ 没有找到已送达的包裹');
  }
  
  // 2. 检查配送照片
  console.log('\n2️⃣ 检查配送照片:');
  const { data: photos } = await supabase
    .from('delivery_photos')
    .select('package_id, courier_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (photos && photos.length > 0) {
    photos.forEach((photo, index) => {
      console.log(`   ${index + 1}. ${photo.package_id} - ${photo.courier_name} - ${photo.created_at}`);
    });
  } else {
    console.log('   ⚠️ 没有找到配送照片');
  }
  
  // 3. 检查配送警报
  console.log('\n3️⃣ 检查配送警报:');
  const { data: alerts } = await supabase
    .from('delivery_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (alerts && alerts.length > 0) {
    alerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. ${alert.title} - ${alert.alert_type} - ${alert.status} - ${alert.created_at}`);
    });
  } else {
    console.log('   ⚠️ 没有找到配送警报');
  }
  
  // 4. 手动测试违规检测
  console.log('\n4️⃣ 手动测试违规检测:');
  const packagesWithCoords = packages?.filter(pkg => 
    pkg.receiver_latitude && pkg.receiver_longitude
  ) || [];
    
  if (packagesWithCoords.length > 0) {
    const testPackage = packagesWithCoords[0];
    console.log(`   测试包裹: ${testPackage.id}`);
    console.log(`   收件地址坐标: ${testPackage.receiver_latitude}, ${testPackage.receiver_longitude}`);
    
    // 模拟骑手在距离收件地址200米处完成配送（违规）
    const courierLat = parseFloat(testPackage.receiver_latitude) + 0.002; // 约200米
    const courierLng = parseFloat(testPackage.receiver_longitude) + 0.002;
    
    const distance = calculateDistance(
      courierLat, courierLng,
      parseFloat(testPackage.receiver_latitude), 
      parseFloat(testPackage.receiver_longitude)
    );
    
    console.log(`   模拟骑手位置: ${courierLat}, ${courierLng}`);
    console.log(`   距离收件地址: ${distance.toFixed(0)} 米`);
    console.log(`   是否违规: ${distance > 100 ? '是' : '否'}`);
    
    if (distance > 100) {
      console.log('   ✅ 应该创建位置违规警报');
    }
  } else {
    console.log('   ⚠️ 没有找到有坐标的包裹进行测试');
  }
  
  // 5. 检查骑手表
  console.log('\n5️⃣ 检查骑手表:');
  const { data: couriers } = await supabase
    .from('couriers')
    .select('id, name, status')
    .limit(5);
    
  if (couriers && couriers.length > 0) {
    couriers.forEach((courier, index) => {
      console.log(`   ${index + 1}. ${courier.id} - ${courier.name} - ${courier.status}`);
    });
  } else {
    console.log('   ⚠️ 没有找到骑手记录');
  }
}

debugAlerts().catch(console.error);
