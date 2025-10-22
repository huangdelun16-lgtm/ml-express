const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPackageManagement() {
  console.log('🧪 开始测试包裹管理功能...\n');

  try {
    // 1. 测试获取所有包裹
    console.log('1️⃣ 测试获取所有包裹...');
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (packagesError) {
      console.error('❌ 获取包裹失败:', packagesError);
      return;
    }

    console.log(`✅ 成功获取 ${packages.length} 个包裹`);
    console.log('📦 包裹列表:');
    packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.id} - ${pkg.receiver_name} (${pkg.status})`);
    });

    // 2. 测试获取活跃快递员
    console.log('\n2️⃣ 测试获取活跃快递员...');
    const { data: couriers, error: couriersError } = await supabase
      .from('couriers')
      .select('*')
      .eq('status', 'active')
      .order('total_deliveries', { ascending: true });

    if (couriersError) {
      console.error('❌ 获取快递员失败:', couriersError);
      return;
    }

    console.log(`✅ 成功获取 ${couriers.length} 个活跃快递员`);
    console.log('👤 快递员列表:');
    couriers.forEach((courier, index) => {
      console.log(`   ${index + 1}. ${courier.name} - ${courier.vehicle_type} (${courier.status})`);
    });

    // 3. 测试包裹状态更新
    if (packages.length > 0) {
      console.log('\n3️⃣ 测试包裹状态更新...');
      const testPackage = packages[0];
      const currentTime = new Date().toLocaleString('zh-CN');
      
      console.log(`📦 测试包裹: ${testPackage.id} (当前状态: ${testPackage.status})`);
      
      // 根据当前状态选择下一个状态
      let newStatus = '';
      let pickupTime = '';
      let deliveryTime = '';
      
      switch (testPackage.status) {
        case '待取件':
          newStatus = '已取件';
          pickupTime = currentTime;
          break;
        case '已取件':
          newStatus = '配送中';
          break;
        case '配送中':
          newStatus = '已送达';
          deliveryTime = currentTime;
          break;
        default:
          newStatus = '待取件';
      }

      const updateData = {
        status: newStatus,
        ...(pickupTime && { pickup_time: pickupTime }),
        ...(deliveryTime && { delivery_time: deliveryTime })
      };

      const { error: updateError } = await supabase
        .from('packages')
        .update(updateData)
        .eq('id', testPackage.id);

      if (updateError) {
        console.error('❌ 更新包裹状态失败:', updateError);
      } else {
        console.log(`✅ 成功更新包裹状态: ${testPackage.status} → ${newStatus}`);
        if (pickupTime) console.log(`   📦 取件时间: ${pickupTime}`);
        if (deliveryTime) console.log(`   🚚 送达时间: ${deliveryTime}`);
      }
    }

    // 4. 测试智能分配算法
    if (packages.length > 0 && couriers.length > 0) {
      console.log('\n4️⃣ 测试智能分配算法...');
      
      // 选择待分配的包裹
      const unassignedPackages = packages.filter(pkg => 
        pkg.status === '待取件' || pkg.courier === '未分配' || !pkg.courier
      );

      if (unassignedPackages.length > 0) {
        console.log(`📦 找到 ${unassignedPackages.length} 个待分配包裹`);
        
        // 模拟智能分配算法
        const packageGroups = groupPackagesByArea(unassignedPackages);
        console.log(`🗺️ 按区域分组: ${packageGroups.length} 个区域`);
        
        packageGroups.forEach((group, index) => {
          console.log(`   区域 ${index + 1}: ${group.length} 个包裹`);
          group.forEach(pkg => {
            console.log(`     - ${pkg.id} → ${pkg.receiver_name} (${pkg.receiver_address})`);
          });
        });

        // 为每个组找最佳快递员
        packageGroups.forEach((group, index) => {
          const bestCourier = findBestCourierForGroup(group, couriers);
          if (bestCourier) {
            const score = calculateCourierScore(bestCourier, group);
            console.log(`   🎯 区域 ${index + 1} 最佳快递员: ${bestCourier.name} (评分: ${score})`);
          }
        });
      } else {
        console.log('ℹ️ 没有待分配的包裹');
      }
    }

    // 5. 测试批量操作
    if (packages.length >= 2) {
      console.log('\n5️⃣ 测试批量状态更新...');
      
      const testPackages = packages.slice(0, 2);
      const packageIds = testPackages.map(pkg => pkg.id);
      
      console.log(`📦 批量更新包裹: ${packageIds.join(', ')}`);
      
      const { error: batchError } = await supabase
        .from('packages')
        .update({ status: '配送中' })
        .in('id', packageIds);

      if (batchError) {
        console.error('❌ 批量更新失败:', batchError);
      } else {
        console.log(`✅ 成功批量更新 ${packageIds.length} 个包裹状态为"配送中"`);
      }
    }

    // 6. 测试包裹分配
    if (packages.length > 0 && couriers.length > 0) {
      console.log('\n6️⃣ 测试包裹分配...');
      
      const testPackage = packages[0];
      const testCourier = couriers[0];
      
      console.log(`📦 分配包裹 ${testPackage.id} 给快递员 ${testCourier.name}`);
      
      const { error: assignError } = await supabase
        .from('packages')
        .update({ 
          courier: testCourier.name,
          status: '已分配'
        })
        .eq('id', testPackage.id);

      if (assignError) {
        console.error('❌ 包裹分配失败:', assignError);
      } else {
        console.log(`✅ 成功分配包裹给快递员 ${testCourier.name}`);
        
        // 更新快递员状态为忙碌
        const { error: courierUpdateError } = await supabase
          .from('couriers')
          .update({ status: 'busy' })
          .eq('id', testCourier.id);

        if (courierUpdateError) {
          console.error('❌ 更新快递员状态失败:', courierUpdateError);
        } else {
          console.log(`✅ 快递员 ${testCourier.name} 状态更新为"忙碌"`);
        }
      }
    }

    console.log('\n🎉 包裹管理功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 智能分配算法函数
function groupPackagesByArea(packages) {
  const groups = {};
  
  packages.forEach(pkg => {
    const areaKey = extractAreaKey(pkg.receiver_address);
    if (!groups[areaKey]) {
      groups[areaKey] = [];
    }
    groups[areaKey].push(pkg);
  });
  
  return Object.values(groups);
}

function extractAreaKey(address) {
  const cleanAddress = address.replace(/\s+/g, '');
  if (cleanAddress.length >= 6) {
    return cleanAddress.substring(0, 6);
  }
  return cleanAddress.substring(0, Math.max(2, cleanAddress.length));
}

function findBestCourierForGroup(packages, couriers) {
  if (couriers.length === 0) return null;
  
  let bestCourier = couriers[0];
  let bestScore = calculateCourierScore(bestCourier, packages);
  
  for (let i = 1; i < couriers.length; i++) {
    const score = calculateCourierScore(couriers[i], packages);
    if (score > bestScore) {
      bestScore = score;
      bestCourier = couriers[i];
    }
  }
  
  return bestCourier;
}

function calculateCourierScore(courier, packages) {
  let score = 100;
  
  // 工作负载评分
  const deliveryPenalty = (courier.total_deliveries || 0) * 2;
  score -= deliveryPenalty;
  
  // 车辆类型评分
  const hasHeavyPackages = packages.some(p => {
    const weight = parseFloat(p.weight) || 0;
    return weight > 5;
  });
  
  if (hasHeavyPackages && courier.vehicle_type === 'car') {
    score += 20;
  } else if (!hasHeavyPackages && courier.vehicle_type === 'motorcycle') {
    score += 15;
  }
  
  // 评分奖励
  const rating = courier.rating || 5.0;
  score += rating * 5;
  
  // 状态检查
  if (courier.status === 'busy') {
    score -= 50;
  }
  
  return score;
}

// 运行测试
testPackageManagement();
