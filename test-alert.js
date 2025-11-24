const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uopkyuluxnrewvlmutam.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
);

async function createTestAlert() {
  console.log('🧪 创建测试违规警报...');
  
  try {
    // 获取骑手ID
    const { data: courierData, error: courierError } = await supabase
      .from('couriers')
      .select('id')
      .eq('name', 'WIN WIN')
      .single();
      
    if (courierError) {
      console.log('❌ 查找骑手失败:', courierError);
      return;
    }
    
    if (!courierData) {
      console.log('❌ 找不到骑手 WIN WIN');
      return;
    }
    
    console.log('✅ 找到骑手ID:', courierData.id);
    
    // 创建测试警报
    const alertData = {
      package_id: 'MDY20251018060662',
      courier_id: courierData.id,
      courier_name: 'WIN WIN',
      alert_type: 'location_violation',
      severity: 'high',
      title: '位置违规 - 距离收件地址过远',
      description: '骑手在距离收件地址 250 米处完成配送，超出100米安全范围',
      status: 'pending',
      courier_latitude: 21.93893 + 0.002,
      courier_longitude: 96.1382025 + 0.002,
      destination_latitude: 21.93893,
      destination_longitude: 96.1382025,
      distance_from_destination: 250,
      action_attempted: 'complete_delivery',
      metadata: {
        test: true,
        created_by: 'manual_test'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('delivery_alerts')
      .insert(alertData);
      
    if (error) {
      console.error('❌ 创建警报失败:', error);
    } else {
      console.log('✅ 测试警报创建成功!');
    }
  } catch (error) {
    console.error('❌ 异常:', error);
  }
}

createTestAlert();
