// 创建测试包裹的JavaScript脚本
// 在浏览器控制台中运行此脚本来创建10个测试包裹

const testPackages = [
  {
    id: 'MDY20250108001',
    sender_name: '张三',
    sender_phone: '09123456789',
    sender_address: '曼德勒市中心区',
    receiver_name: '李四',
    receiver_phone: '09234567890',
    receiver_address: '曼德勒东区',
    package_type: '文件',
    weight: '0.5',
    description: '重要合同文件',
    status: '已取件',
    create_time: '2025-01-08 09:00:00',
    pickup_time: '2025-01-08 10:30:00',
    courier: 'rider001',
    price: '1500',
    sender_code: 'SC001'
  },
  {
    id: 'MDY20250108002',
    sender_name: '王五',
    sender_phone: '09345678901',
    sender_address: '曼德勒西区',
    receiver_name: '赵六',
    receiver_phone: '09456789012',
    receiver_address: '曼德勒南区',
    package_type: '包裹',
    weight: '2.0',
    description: '电子产品',
    status: '已送达',
    create_time: '2025-01-08 08:30:00',
    pickup_time: '2025-01-08 11:00:00',
    delivery_time: '2025-01-08 14:30:00',
    courier: 'rider002',
    price: '3000',
    delivery_store_id: 'store001',
    delivery_store_name: '测试中转站1',
    store_receive_code: 'ST001',
    sender_code: 'SC002'
  },
  {
    id: 'MDY20250108003',
    sender_name: '孙七',
    sender_phone: '09567890123',
    sender_address: '曼德勒北区',
    receiver_name: '周八',
    receiver_phone: '09678901234',
    receiver_address: '曼德勒东南区',
    package_type: '包裹',
    weight: '1.5',
    description: '服装',
    status: '待派送',
    create_time: '2025-01-08 07:45:00',
    pickup_time: '2025-01-08 12:15:00',
    courier: 'rider003',
    price: '2500',
    sender_code: 'SC003'
  },
  {
    id: 'MDY20250108004',
    sender_name: '吴九',
    sender_phone: '09789012345',
    sender_address: '曼德勒西南区',
    receiver_name: '郑十',
    receiver_phone: '09890123456',
    receiver_address: '曼德勒东北区',
    package_type: '包裹',
    weight: '3.0',
    description: '书籍',
    status: '已送达',
    create_time: '2025-01-08 06:20:00',
    pickup_time: '2025-01-08 13:45:00',
    delivery_time: '2025-01-08 16:20:00',
    courier: 'rider001',
    price: '4000',
    delivery_store_id: 'store002',
    delivery_store_name: '测试中转站2',
    store_receive_code: 'ST002',
    sender_code: 'SC004'
  },
  {
    id: 'MDY20250108005',
    sender_name: '陈十一',
    sender_phone: '09901234567',
    sender_address: '曼德勒东南区',
    receiver_name: '林十二',
    receiver_phone: '09012345678',
    receiver_address: '曼德勒西北区',
    package_type: '文件',
    weight: '0.3',
    description: '发票',
    status: '已取件',
    create_time: '2025-01-08 15:30:00',
    pickup_time: '2025-01-08 16:45:00',
    courier: 'rider002',
    price: '1200',
    sender_code: 'SC005'
  },
  {
    id: 'MDY20250108006',
    sender_name: '黄十三',
    sender_phone: '09123456780',
    sender_address: '曼德勒西北区',
    receiver_name: '刘十四',
    receiver_phone: '09234567801',
    receiver_address: '曼德勒西南区',
    package_type: '包裹',
    weight: '2.5',
    description: '日用品',
    status: '已送达',
    create_time: '2025-01-08 05:15:00',
    pickup_time: '2025-01-08 17:30:00',
    delivery_time: '2025-01-08 18:45:00',
    courier: 'rider003',
    price: '3500',
    delivery_store_id: 'store001',
    delivery_store_name: '测试中转站1',
    store_receive_code: 'ST001',
    sender_code: 'SC006'
  },
  {
    id: 'MDY20250108007',
    sender_name: '何十五',
    sender_phone: '09345678902',
    sender_address: '曼德勒东北区',
    receiver_name: '罗十六',
    receiver_phone: '09456789023',
    receiver_address: '曼德勒南区',
    package_type: '包裹',
    weight: '1.8',
    description: '食品',
    status: '待派送',
    create_time: '2025-01-08 14:20:00',
    pickup_time: '2025-01-08 19:15:00',
    courier: 'rider001',
    price: '2800',
    sender_code: 'SC007'
  },
  {
    id: 'MDY20250108008',
    sender_name: '高十七',
    sender_phone: '09567890134',
    sender_address: '曼德勒南区',
    receiver_name: '梁十八',
    receiver_phone: '09678901245',
    receiver_address: '曼德勒北区',
    package_type: '包裹',
    weight: '4.0',
    description: '工具',
    status: '已送达',
    create_time: '2025-01-08 04:30:00',
    pickup_time: '2025-01-08 20:00:00',
    delivery_time: '2025-01-08 21:15:00',
    courier: 'rider002',
    price: '5000',
    delivery_store_id: 'store002',
    delivery_store_name: '测试中转站2',
    store_receive_code: 'ST002',
    sender_code: 'SC008'
  },
  {
    id: 'MDY20250108009',
    sender_name: '宋十九',
    sender_phone: '09789012356',
    sender_address: '曼德勒西南区',
    receiver_name: '唐二十',
    receiver_phone: '09890123467',
    receiver_address: '曼德勒东区',
    package_type: '文件',
    weight: '0.8',
    description: '证书',
    status: '已取件',
    create_time: '2025-01-08 13:45:00',
    pickup_time: '2025-01-08 21:30:00',
    courier: 'rider003',
    price: '1800',
    sender_code: 'SC009'
  },
  {
    id: 'MDY20250108010',
    sender_name: '韩二十一',
    sender_phone: '09901234578',
    sender_address: '曼德勒东区',
    receiver_name: '冯二十二',
    receiver_phone: '09012345689',
    receiver_address: '曼德勒西区',
    package_type: '包裹',
    weight: '1.2',
    description: '化妆品',
    status: '已送达',
    create_time: '2025-01-08 03:15:00',
    pickup_time: '2025-01-08 22:00:00',
    delivery_time: '2025-01-08 22:30:00',
    courier: 'rider001',
    price: '2200',
    delivery_store_id: 'store001',
    delivery_store_name: '测试中转站1',
    store_receive_code: 'ST001',
    sender_code: 'SC010'
  }
];

// 创建包裹的函数
async function createTestPackages() {
  console.log('开始创建10个测试包裹...');
  
  for (let i = 0; i < testPackages.length; i++) {
    const pkg = testPackages[i];
    try {
      // 使用packageService创建包裹
      const result = await packageService.createPackage(pkg);
      if (result) {
        console.log(`✅ 包裹 ${pkg.id} 创建成功`);
      } else {
        console.log(`❌ 包裹 ${pkg.id} 创建失败`);
      }
    } catch (error) {
      console.error(`❌ 包裹 ${pkg.id} 创建异常:`, error);
    }
    
    // 添加延迟避免过快请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('测试包裹创建完成！');
}

// 运行创建函数
createTestPackages();
