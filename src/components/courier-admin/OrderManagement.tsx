import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Typography,
  Divider,
  Steps,
  Timeline,
  Avatar,
  Tooltip,
  Badge,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExportOutlined,
  FilterOutlined,
  ReloadOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Step } = Steps;
const { Item } = Timeline;

interface Order {
  key: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageType: string;
  weight: number;
  distance: number;
  amount: number;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  createdAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
}

const mockOrders: Order[] = [
  {
    key: '1',
    orderId: 'ML001234',
    customerName: '张三',
    customerPhone: '09-123456789',
    senderAddress: '仰光市中心区茵雅湖路123号',
    receiverName: '李四',
    receiverPhone: '09-987654321',
    receiverAddress: '曼德勒市中心区84街456号',
    packageType: '文件',
    weight: 0.5,
    distance: 5.2,
    amount: 15000,
    status: 'in_transit',
    courierId: 'C001',
    courierName: '李师傅',
    courierPhone: '09-111222333',
    createdAt: '2024-01-15 09:30:00',
    estimatedDelivery: '2024-01-15 14:30:00',
  },
  {
    key: '2',
    orderId: 'ML001235',
    customerName: 'Aung Ko',
    customerPhone: '09-555666777',
    senderAddress: '仰光市东区大学路789号',
    receiverName: 'Ma Thida',
    receiverPhone: '09-444555666',
    receiverAddress: '仰光市西区机场路321号',
    packageType: '食品',
    weight: 2.0,
    distance: 8.5,
    amount: 25000,
    status: 'pending',
    createdAt: '2024-01-15 11:15:00',
  },
  {
    key: '3',
    orderId: 'ML001236',
    customerName: '王五',
    customerPhone: '09-888999000',
    senderAddress: '曼德勒市北区皇宫路555号',
    receiverName: '赵六',
    receiverPhone: '09-777888999',
    receiverAddress: '曼德勒市南区火车站路666号',
    packageType: '电子产品',
    weight: 1.5,
    distance: 3.8,
    amount: 18000,
    status: 'delivered',
    courierId: 'C002',
    courierName: '王师傅',
    courierPhone: '09-222333444',
    createdAt: '2024-01-15 08:00:00',
    actualDelivery: '2024-01-15 12:30:00',
  },
];

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  // Modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [form] = Form.useForm();

  const statusOptions = [
    { label: '全部', value: 'all' },
    { label: '待接单', value: 'pending' },
    { label: '已接单', value: 'accepted' },
    { label: '已取件', value: 'picked_up' },
    { label: '配送中', value: 'in_transit' },
    { label: '已送达', value: 'delivered' },
    { label: '已取消', value: 'cancelled' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'orange',
    accepted: 'blue',
    picked_up: 'cyan',
    in_transit: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };

  const statusLabels: Record<string, string> = {
    pending: '待接单',
    accepted: '已接单',
    picked_up: '已取件',
    in_transit: '配送中',
    delivered: '已送达',
    cancelled: '已取消',
  };

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      fixed: 'left',
      width: 120,
      render: (text) => <Text strong copyable>{text}</Text>,
    },
    {
      title: '寄件人',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 100,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.customerPhone}
          </Text>
        </div>
      ),
    },
    {
      title: '收件人',
      dataIndex: 'receiverName',
      key: 'receiverName',
      width: 100,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.receiverPhone}
          </Text>
        </div>
      ),
    },
    {
      title: '包裹信息',
      key: 'packageInfo',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{record.packageType}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.weight}kg | {record.distance}km
          </Text>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} MMK
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '快递员',
      key: 'courier',
      width: 120,
      render: (_, record) => {
        if (!record.courierName) {
          return <Text type="secondary">未分配</Text>;
        }
        return (
          <div>
            <div>{record.courierName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.courierPhone}
            </Text>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (time) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewOrder(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditOrder(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteOrder(record.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderId.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.receiverName.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange) {
      const orderDate = dayjs(order.createdAt);
      matchesDate = orderDate.isAfter(dateRange[0]) && orderDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    form.setFieldsValue(order);
    setEditModalVisible(true);
  };

  const handleDeleteOrder = (key: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个订单吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setOrders(orders.filter(order => order.key !== key));
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个订单吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setOrders(orders.filter(order => !selectedRowKeys.includes(order.key)));
        setSelectedRowKeys([]);
      },
    });
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Exporting orders...');
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const renderOrderTimeline = (order: Order) => {
    const timelineItems = [
      {
        color: 'green',
        children: (
          <div>
            <Text strong>订单创建</Text>
            <br />
            <Text type="secondary">{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
          </div>
        ),
      },
    ];

    if (order.status !== 'pending') {
      timelineItems.push({
        color: 'blue',
        children: (
          <div>
            <Text strong>订单接受</Text>
            <br />
            <Text type="secondary">快递员: {order.courierName}</Text>
          </div>
        ),
      });
    }

    if (['picked_up', 'in_transit', 'delivered'].includes(order.status)) {
      timelineItems.push({
        color: 'orange',
        children: (
          <div>
            <Text strong>包裹取件</Text>
            <br />
            <Text type="secondary">已从寄件地址取件</Text>
          </div>
        ),
      });
    }

    if (['in_transit', 'delivered'].includes(order.status)) {
      timelineItems.push({
        color: 'purple',
        children: (
          <div>
            <Text strong>配送中</Text>
            <br />
            <Text type="secondary">正在前往目的地</Text>
          </div>
        ),
      });
    }

    if (order.status === 'delivered') {
      timelineItems.push({
        color: 'green',
        children: (
          <div>
            <Text strong>配送完成</Text>
            <br />
            <Text type="secondary">{order.actualDelivery ? dayjs(order.actualDelivery).format('YYYY-MM-DD HH:mm') : '已送达'}</Text>
          </div>
        ),
      });
    }

    return <Timeline items={timelineItems} />;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>订单管理</Title>
        <Text type="secondary">管理所有快递订单，跟踪配送状态</Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="搜索订单号、客户姓名"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="订单状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              options={statusOptions}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
              >
                新建订单
              </Button>
              <Button 
                icon={<ExportOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
              {selectedRowKeys.length > 0 && (
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredOrders}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          scroll={{ x: 1200 }}
          pagination={{
            total: filteredOrders.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        title={`订单详情 - ${selectedOrder?.orderId}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedOrder && (
          <div>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="订单信息" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>订单号：</Text>
                      <Text copyable>{selectedOrder.orderId}</Text>
                    </div>
                    <div>
                      <Text strong>状态：</Text>
                      <Tag color={statusColors[selectedOrder.status]}>
                        {statusLabels[selectedOrder.status]}
                      </Tag>
                    </div>
                    <div>
                      <Text strong>包裹类型：</Text>
                      <Text>{selectedOrder.packageType}</Text>
                    </div>
                    <div>
                      <Text strong>重量：</Text>
                      <Text>{selectedOrder.weight} kg</Text>
                    </div>
                    <div>
                      <Text strong>距离：</Text>
                      <Text>{selectedOrder.distance} km</Text>
                    </div>
                    <div>
                      <Text strong>金额：</Text>
                      <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                        {selectedOrder.amount.toLocaleString()} MMK
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="联系信息" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Divider orientation="left" orientationMargin={0}>寄件人</Divider>
                    <div>
                      <Text strong>姓名：</Text>
                      <Text>{selectedOrder.customerName}</Text>
                    </div>
                    <div>
                      <Text strong>电话：</Text>
                      <Text copyable>{selectedOrder.customerPhone}</Text>
                    </div>
                    <div>
                      <Text strong>地址：</Text>
                      <Text>{selectedOrder.senderAddress}</Text>
                    </div>
                    
                    <Divider orientation="left" orientationMargin={0}>收件人</Divider>
                    <div>
                      <Text strong>姓名：</Text>
                      <Text>{selectedOrder.receiverName}</Text>
                    </div>
                    <div>
                      <Text strong>电话：</Text>
                      <Text copyable>{selectedOrder.receiverPhone}</Text>
                    </div>
                    <div>
                      <Text strong>地址：</Text>
                      <Text>{selectedOrder.receiverAddress}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
            
            {selectedOrder.courierName && (
              <Card title="快递员信息" size="small" style={{ marginTop: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col>
                    <Avatar icon={<UserOutlined />} size="large" />
                  </Col>
                  <Col flex={1}>
                    <div>
                      <Text strong>{selectedOrder.courierName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">{selectedOrder.courierPhone}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
            
            <Card title="配送进度" size="small" style={{ marginTop: 16 }}>
              {renderOrderTimeline(selectedOrder)}
            </Card>
          </div>
        )}
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        title="编辑订单"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            // Update order logic here
            console.log('Updated order:', values);
            setEditModalVisible(false);
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerName" label="寄件人姓名">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerPhone" label="寄件人电话">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="senderAddress" label="寄件地址">
            <Input.TextArea rows={2} />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="receiverName" label="收件人姓名">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiverPhone" label="收件人电话">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="receiverAddress" label="收件地址">
            <Input.TextArea rows={2} />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="packageType" label="包裹类型">
                <Select>
                  <Select.Option value="文件">文件</Select.Option>
                  <Select.Option value="食品">食品</Select.Option>
                  <Select.Option value="电子产品">电子产品</Select.Option>
                  <Select.Option value="服装">服装</Select.Option>
                  <Select.Option value="其他">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="重量(kg)">
                <Input type="number" step="0.1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount" label="金额(MMK)">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="status" label="订单状态">
            <Select>
              {Object.entries(statusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderManagement;
