const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is up' });
});

app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Order list placeholder (connect to database later)'
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    projectId: process.env.GCLOUD_PROJECT || 'ml-express-473205',
    timestamp: new Date().toISOString()
  });
});

// 模拟骑手任务列表
app.get('/api/couriers/:courierId/tasks', (req, res) => {
  const { courierId } = req.params;
  res.json({
    success: true,
    data: [
      {
        taskId: 'T20240925-001',
        orderId: 'O20240925-001',
        pickupAddress: '仰光市中心区 市府路 120号',
        deliveryAddress: '仰光市北区 园林街 88号',
        customerName: '王小明',
        customerPhone: '09123456789',
        status: 'ASSIGNED',
        assignedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        expectedDeliveryTime: new Date(Date.now() + 40 * 60 * 1000).toISOString()
      },
      {
        taskId: 'T20240925-002',
        orderId: 'O20240925-002',
        pickupAddress: '仰光市南区 海港路 56号',
        deliveryAddress: '仰光市东区 金塔大道 23号',
        customerName: '李芳',
        customerPhone: '09987654321',
        status: 'IN_PROGRESS',
        assignedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        expectedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString()
      }
    ],
    message: `Courier ${courierId} tasks loaded`
  });
});

// 模拟更新骑手任务状态
app.post('/api/couriers/:courierId/tasks/:taskId/status', (req, res) => {
  const { courierId, taskId } = req.params;
  const { status, latitude, longitude, notes } = req.body;

  res.json({
    success: true,
    data: {
      taskId,
      orderId: `O${taskId.slice(1)}`,
      pickupAddress: '仰光市中心区 测试取件点',
      deliveryAddress: '仰光市北区 测试送达点',
      customerName: '测试客户',
      customerPhone: '09111111111',
      status,
      assignedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expectedDeliveryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      lastUpdateLocation: latitude && longitude ? { latitude, longitude } : null,
      notes: notes || null
    },
    message: `任务 ${taskId} 状态已更新为 ${status}`
  });
});

// 模拟骑手位置上传
app.post('/api/couriers/:courierId/location', (req, res) => {
  const { courierId } = req.params;
  const { latitude, longitude } = req.body;

  console.log(`Courier ${courierId} location update:`, latitude, longitude);

  res.json({
    success: true,
    data: null,
    message: '位置上传成功'
  });
});

// 模拟骑手统计数据
app.get('/api/couriers/:courierId/stats', (req, res) => {
  const { courierId } = req.params;

  res.json({
    success: true,
    data: {
      totalCompleted: 156,
      totalEarnings: 235000.0,
      activeTasks: 4,
      rating: 4.8,
      onlineHours: 320.5,
      courierId
    },
    message: '骑手统计信息'
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`ML Express API listening on port ${port}`);
});
