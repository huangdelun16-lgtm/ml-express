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
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface User {
  key: string;
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive' | 'blocked';
  orderCount: number;
  totalSpent: number;
  registeredAt: string;
  lastOrder: string;
}

const mockUsers: User[] = [
  {
    key: '1',
    id: 'U001',
    name: '张三',
    phone: '09-123456789',
    email: 'zhangsan@email.com',
    address: '仰光市中心区茵雅湖路123号',
    status: 'active',
    orderCount: 25,
    totalSpent: 450000,
    registeredAt: '2023-12-01',
    lastOrder: '2024-01-15',
  },
  {
    key: '2',
    id: 'U002',
    name: 'Aung Ko',
    phone: '09-555666777',
    email: 'aungko@email.com',
    address: '仰光市东区大学路789号',
    status: 'active',
    orderCount: 18,
    totalSpent: 320000,
    registeredAt: '2023-11-15',
    lastOrder: '2024-01-14',
  },
  {
    key: '3',
    id: 'U003',
    name: '王五',
    phone: '09-888999000',
    email: 'wangwu@email.com',
    address: '曼德勒市北区皇宫路555号',
    status: 'inactive',
    orderCount: 8,
    totalSpent: 120000,
    registeredAt: '2023-10-20',
    lastOrder: '2023-12-20',
  },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusColors = {
    active: 'green',
    inactive: 'orange',
    blocked: 'red',
  };

  const statusLabels = {
    active: '活跃',
    inactive: '不活跃',
    blocked: '已封禁',
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户信息',
      key: 'userInfo',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div><Text strong>{record.name}</Text></div>
            <div><Text type="secondary">{record.phone}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 150,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {statusLabels[status as keyof typeof statusLabels]}
        </Tag>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 80,
      sorter: (a, b) => a.orderCount - b.orderCount,
    },
    {
      title: '消费金额',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 120,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} MMK
        </Text>
      ),
      sorter: (a, b) => a.totalSpent - b.totalSpent,
    },
    {
      title: '注册时间',
      dataIndex: 'registeredAt',
      key: 'registeredAt',
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} size="small" />
          <Button type="text" icon={<EditOutlined />} size="small" />
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         user.phone.includes(searchText) ||
                         user.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalUsers = users.length;
  const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);
  const avgOrderValue = totalRevenue / users.reduce((sum, u) => sum + u.orderCount, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>用户管理</Title>
        <Text type="secondary">管理平台用户，查看用户行为分析</Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={activeUsers}
              suffix={`/ ${totalUsers}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总消费额"
              value={totalRevenue}
              precision={0}
              suffix="MMK"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均订单价值"
              value={avgOrderValue}
              precision={0}
              suffix="MMK"
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
              placeholder="搜索用户姓名、电话、邮箱"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="用户状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">不活跃</Select.Option>
              <Select.Option value="blocked">已封禁</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />}>
                添加用户
              </Button>
              <Button>导出用户</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{
            total: filteredUsers.length,
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

export default UserManagement;
