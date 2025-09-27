import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Progress,
  List,
  Avatar,
  Tag,
  Typography,
  Space,
  Button,
} from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  UserOutlined,
  CarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const { Title, Text } = Typography;

// Mock data
const orderTrendData = [
  { name: '周一', orders: 120, revenue: 2400 },
  { name: '周二', orders: 132, revenue: 2800 },
  { name: '周三', orders: 101, revenue: 2200 },
  { name: '周四', orders: 134, revenue: 2900 },
  { name: '周五', orders: 190, revenue: 3800 },
  { name: '周六', orders: 230, revenue: 4600 },
  { name: '周日', orders: 210, revenue: 4200 },
];

const orderStatusData = [
  { name: '待接单', value: 45, color: '#faad14' },
  { name: '配送中', value: 120, color: '#1890ff' },
  { name: '已完成', value: 280, color: '#52c41a' },
  { name: '已取消', value: 15, color: '#f5222d' },
];

const recentOrdersData: any[] = [];

const topCouriers = [
  {
    name: '李师傅',
    avatar: null,
    orders: 45,
    rating: 4.9,
    revenue: '680,000 MMK',
  },
  {
    name: '王师傅',
    avatar: null,
    orders: 38,
    rating: 4.8,
    revenue: '570,000 MMK',
  },
  {
    name: 'Ko Ko',
    avatar: null,
    orders: 32,
    rating: 4.7,
    revenue: '480,000 MMK',
  },
];

const CourierDashboard: React.FC = () => {
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          '待接单': 'orange',
          '配送中': 'blue',
          '已完成': 'green',
          '已取消': 'red',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '快递员',
      dataIndex: 'courier',
      key: 'courier',
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>仪表盘</Title>
        <Text type="secondary">缅甸同城快递管理系统 - 实时数据概览</Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={234}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShoppingCartOutlined />}
              suffix={
                <span style={{ fontSize: '14px', color: '#52c41a' }}>
                  <ArrowUpOutlined /> 12%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日收入"
              value={3420000}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DollarOutlined />}
              suffix={
                <span style={{ fontSize: '12px' }}>
                  MMK <ArrowUpOutlined style={{ color: '#52c41a' }} /> 8%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃快递员"
              value={28}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              prefix={<CarOutlined />}
              suffix={
                <span style={{ fontSize: '14px', color: '#faad14' }}>
                  在线
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={1240}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<UserOutlined />}
              suffix={
                <span style={{ fontSize: '14px', color: '#52c41a' }}>
                  <ArrowUpOutlined /> 5%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Order Trend Chart */}
        <Col xs={24} lg={16}>
          <Card 
            title="订单趋势" 
            extra={<Button type="link">查看详情</Button>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={orderTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke="#1890ff"
                  strokeWidth={2}
                  name="订单数量"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#52c41a"
                  strokeWidth={2}
                  name="收入 (千MMK)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Order Status Pie Chart */}
        <Col xs={24} lg={8}>
          <Card title="订单状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16 }}>
              {orderStatusData.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Space>
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: item.color, 
                        borderRadius: 2 
                      }} 
                    />
                    <Text>{item.name}</Text>
                  </Space>
                  <Text strong>{item.value}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tables Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Orders */}
        <Col xs={24} lg={16}>
          <Card 
            title="最近订单" 
            extra={<Button type="link">查看全部</Button>}
          >
            <Table
              columns={orderColumns}
              dataSource={recentOrdersData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Top Couriers */}
        <Col xs={24} lg={8}>
          <Card title="优秀快递员">
            <List
              itemLayout="horizontal"
              dataSource={topCouriers}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: '#1890ff' }}
                        icon={<UserOutlined />}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text strong>{item.name}</Text>
                        <Tag color="gold">⭐ {item.rating}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>订单: {item.orders}单</div>
                        <div>收入: {item.revenue}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* System Status */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="系统状态">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={92}
                    format={percent => `${percent}%`}
                    strokeColor="#52c41a"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>服务器状态</Text>
                    <br />
                    <Text type="secondary">运行正常</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={78}
                    format={percent => `${percent}%`}
                    strokeColor="#1890ff"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>数据库性能</Text>
                    <br />
                    <Text type="secondary">良好</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={85}
                    format={percent => `${percent}%`}
                    strokeColor="#faad14"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text strong>API响应</Text>
                    <br />
                    <Text type="secondary">快速</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourierDashboard;
