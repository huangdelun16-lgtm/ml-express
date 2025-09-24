import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic,
  Switch,
  Rate,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Courier {
  key: string;
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
  status: 'online' | 'offline' | 'busy' | 'suspended';
  rating: number;
  completedOrders: number;
  totalEarnings: number;
  currentLocation: string;
  joinedAt: string;
  lastActive: string;
}

const mockCouriers: Courier[] = [
  {
    key: '1',
    id: 'C001',
    name: '李师傅',
    phone: '09-111222333',
    email: 'li@courier.com',
    vehicleType: '摩托车',
    vehiclePlate: 'YGN-1234',
    status: 'online',
    rating: 4.9,
    completedOrders: 245,
    totalEarnings: 1250000,
    currentLocation: '仰光市中心区',
    joinedAt: '2023-08-15',
    lastActive: '2024-01-15 12:30',
  },
  {
    key: '2',
    id: 'C002',
    name: '王师傅',
    phone: '09-222333444',
    email: 'wang@courier.com',
    vehicleType: '面包车',
    vehiclePlate: 'MDL-5678',
    status: 'busy',
    rating: 4.8,
    completedOrders: 189,
    totalEarnings: 980000,
    currentLocation: '曼德勒市北区',
    joinedAt: '2023-09-20',
    lastActive: '2024-01-15 13:15',
  },
  {
    key: '3',
    id: 'C003',
    name: 'Ko Ko',
    phone: '09-333444555',
    email: 'koko@courier.com',
    vehicleType: '摩托车',
    vehiclePlate: 'YGN-9876',
    status: 'offline',
    rating: 4.7,
    completedOrders: 156,
    totalEarnings: 720000,
    currentLocation: '仰光市东区',
    joinedAt: '2023-10-10',
    lastActive: '2024-01-14 18:00',
  },
];

const CourierManagement: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>(mockCouriers);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusColors = {
    online: 'green',
    offline: 'default',
    busy: 'orange',
    suspended: 'red',
  };

  const statusLabels = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    suspended: '暂停',
  };

  const columns: ColumnsType<Courier> = [
    {
      title: '快递员ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '快递员信息',
      key: 'courierInfo',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<CarOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div><Text strong>{record.name}</Text></div>
            <div><Text type="secondary">{record.phone}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: '车辆信息',
      key: 'vehicle',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.vehicleType}</div>
          <Text type="secondary">{record.vehiclePlate}</Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {statusLabels[status as keyof typeof statusLabels]}
        </Tag>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      render: (rating) => (
        <Space>
          <Rate disabled defaultValue={rating} style={{ fontSize: '12px' }} />
          <Text>{rating}</Text>
        </Space>
      ),
    },
    {
      title: '完成订单',
      dataIndex: 'completedOrders',
      key: 'completedOrders',
      width: 100,
      sorter: (a, b) => a.completedOrders - b.completedOrders,
    },
    {
      title: '总收入',
      dataIndex: 'totalEarnings',
      key: 'totalEarnings',
      width: 120,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} MMK
        </Text>
      ),
      sorter: (a, b) => a.totalEarnings - b.totalEarnings,
    },
    {
      title: '当前位置',
      dataIndex: 'currentLocation',
      key: 'currentLocation',
      width: 120,
      render: (location) => (
        <Space>
          <EnvironmentOutlined />
          <Text>{location}</Text>
        </Space>
      ),
    },
    {
      title: '在线状态',
      key: 'onlineToggle',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.status === 'online'}
          onChange={(checked) => {
            // Toggle online status
            console.log(`Toggle ${record.name} to ${checked ? 'online' : 'offline'}`);
          }}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} size="small" />
          <Button type="text" icon={<EditOutlined />} size="small" />
          <Button 
            type="text" 
            icon={<PhoneOutlined />} 
            size="small"
            onClick={() => window.open(`tel:${record.phone}`)}
          />
        </Space>
      ),
    },
  ];

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         courier.phone.includes(searchText) ||
                         courier.vehiclePlate.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || courier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const onlineCouriers = couriers.filter(c => c.status === 'online').length;
  const totalCouriers = couriers.length;
  const avgRating = couriers.reduce((sum, c) => sum + c.rating, 0) / couriers.length;
  const totalOrders = couriers.reduce((sum, c) => sum + c.completedOrders, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>快递员管理</Title>
        <Text type="secondary">管理快递员信息，监控配送状态和业绩</Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总快递员数"
              value={totalCouriers}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="在线快递员"
              value={onlineCouriers}
              suffix={`/ ${totalCouriers}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={Math.round((onlineCouriers / totalCouriers) * 100)} 
                size="small" 
                strokeColor="#52c41a"
                showInfo={false}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={avgRating}
              precision={1}
              suffix="⭐"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总完成订单"
              value={totalOrders}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="搜索快递员姓名、电话、车牌"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="在线状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value="online">在线</Select.Option>
              <Select.Option value="offline">离线</Select.Option>
              <Select.Option value="busy">忙碌</Select.Option>
              <Select.Option value="suspended">暂停</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />}>
                添加快递员
              </Button>
              <Button>导出数据</Button>
              <Button>批量操作</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCouriers}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total: filteredCouriers.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default CourierManagement;
