const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uopkyuluxnrewvlmutam.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
);

async function createViolationAlert() {
  console.log('🧪 为THU THU创建违规警报...');
  
  try {
    // 获取THU THU骑手ID
    const { data: courierData, error: courierError } = await supabase
      .from('couriers')
      .select('id')
      .eq('name', 'THU THU')
      .single();
      
    if (courierError) {
      console.log('❌ 查找骑手失败:', courierError);
      return;
    }
    
    if (!courierData) {
      console.log('❌ 找不到骑手 THU THU');
      return;
    }
    
    console.log('✅ 找到骑手ID:', courierData.id);
    
    // 为第一个包裹创建违规警报
    const alertData = {
      package_id: 'MDY20251018202100',
      courier_id: courierData.id,
      courier_name: 'THU THU',
      alert_type: 'location_violation',
      severity: 'high',
      title: '位置违规 - 距离收件地址过远',
      description: '骑手在距离收件地址 200 米处完成配送，超出100米安全范围',
      status: 'pending',
      courier_latitude: 21.9440341,
      courier_longitude: 96.140887,
      destination_latitude: 21.9420341,
      destination_longitude: 96.138887,
      distance_from_destination: 200,
      action_attempted: 'complete_delivery',
      metadata: {
        auto_detected: true,
        detection_time: new Date().toISOString(),
        manual_test: true
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
      console.log('✅ 警报创建成功!');
    }
  } catch (error) {
    console.error('❌ 异常:', error);
  }
}

createViolationAlert();
