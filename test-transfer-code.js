// 测试中转码功能的JavaScript脚本
// 在浏览器控制台中运行此脚本

console.log('开始测试中转码功能...');

// 1. 检查当前包裹数据
async function checkCurrentPackages() {
  try {
    const packages = await packageService.getAllPackages();
    console.log('当前包裹列表:', packages);
    
    // 查找PYIGYITAGON店铺的包裹
    const pyigyitagonPackages = packages.filter(pkg => 
      pkg.delivery_store_name === 'PYIGYITAGON' || 
      pkg.delivery_store_name?.includes('PYIGYITAGON')
    );
    
    console.log('PYIGYITAGON店铺的包裹:', pyigyitagonPackages);
    
    return pyigyitagonPackages;
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    return [];
  }
}

// 2. 为包裹添加中转码
async function addTransferCodeToPackage(packageId) {
  try {
    const transferCode = `TCPGT${packageId.slice(-4)}${Date.now().toString().slice(-3)}`;
    console.log(`为包裹 ${packageId} 生成中转码: ${transferCode}`);
    
    // 更新包裹状态并添加中转码
    const success = await packageService.updatePackageStatus(
      packageId,
      '已送达', // 保持当前状态
      undefined, // pickupTime
      undefined, // deliveryTime  
      undefined, // courierName
      transferCode // transferCode
    );
    
    if (success) {
      console.log(`✅ 包裹 ${packageId} 中转码添加成功: ${transferCode}`);
      return transferCode;
    } else {
      console.log(`❌ 包裹 ${packageId} 中转码添加失败`);
      return null;
    }
  } catch (error) {
    console.error(`包裹 ${packageId} 中转码添加异常:`, error);
    return null;
  }
}

// 3. 测试中转码显示
async function testTransferCodeDisplay() {
  console.log('=== 测试中转码显示功能 ===');
  
  // 检查当前包裹
  const packages = await checkCurrentPackages();
  
  if (packages.length === 0) {
    console.log('❌ 没有找到PYIGYITAGON店铺的包裹');
    console.log('请先创建一些测试包裹，或者检查包裹的delivery_store_name字段');
    return;
  }
  
  // 为第一个包裹添加中转码
  const firstPackage = packages[0];
  console.log(`处理包裹: ${firstPackage.id}`);
  
  const transferCode = await addTransferCodeToPackage(firstPackage.id);
  
  if (transferCode) {
    console.log('✅ 中转码添加成功！');
    console.log('现在请刷新页面，然后：');
    console.log('1. 打开"快递店管理"页面');
    console.log('2. 找到PYIGYITAGON店铺');
    console.log('3. 点击"🏪 中转包裹"按钮');
    console.log('4. 查看包裹详情中的中转码显示');
  } else {
    console.log('❌ 中转码添加失败');
  }
}

// 4. 检查数据库字段
async function checkDatabaseField() {
  console.log('=== 检查数据库字段 ===');
  
  try {
    // 尝试更新一个测试包裹来检查字段是否存在
    const testResult = await packageService.updatePackageStatus(
      'TEST_PACKAGE',
      '测试',
      undefined,
      undefined,
      undefined,
      'TEST_CODE'
    );
    
    console.log('数据库字段检查结果:', testResult);
  } catch (error) {
    console.error('数据库字段检查失败:', error);
    console.log('可能的原因：');
    console.log('1. transfer_code字段还没有添加到数据库');
    console.log('2. 需要先在Supabase中执行SQL脚本');
  }
}

// 运行测试
async function runTransferCodeTest() {
  console.log('🚀 开始中转码功能测试...');
  
  // 检查数据库字段
  await checkDatabaseField();
  
  // 测试中转码显示
  await testTransferCodeDisplay();
  
  console.log('测试完成！');
}

// 执行测试
runTransferCodeTest();
