import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Table,
  Modal,
  message,
  Upload,
  Avatar,
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PriceRule {
  key: string;
  id: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  pricePerKg: number;
  maxDistance: number;
  isActive: boolean;
}

interface AdminUser {
  key: string;
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operator' | 'finance';
  status: 'active' | 'inactive';
  lastLogin: string;
}

const mockPriceRules: PriceRule[] = [
  {
    key: '1',
    id: 'PR001',
    name: '市内标准',
    basePrice: 5000,
    pricePerKm: 1000,
    pricePerKg: 500,
    maxDistance: 10,
    isActive: true,
  },
  {
    key: '2',
    id: 'PR002',
    name: '跨区配送',
    basePrice: 8000,
    pricePerKm: 1500,
    pricePerKg: 800,
    maxDistance: 50,
    isActive: true,
  },
];

const mockAdminUsers: AdminUser[] = [
  {
    key: '1',
    id: 'A001',
    username: 'admin',
    email: 'admin@marketlink.com',
    role: 'super_admin',
    status: 'active',
    lastLogin: '2024-01-15 10:30:00',
  },
  {
    key: '2',
    id: 'A002',
    username: 'operator1',
    email: 'operator1@marketlink.com',
    role: 'operator',
    status: 'active',
    lastLogin: '2024-01-14 16:20:00',
  },
];

const SystemSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [priceRules, setPriceRules] = useState<PriceRule[]>(mockPriceRules);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceRule | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const roleLabels = {
    super_admin: '超级管理员',
    admin: '管理员',
    operator: '操作员',
    finance: '财务',
  };

  const priceColumns: ColumnsType<PriceRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '起步价',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price) => `${price.toLocaleString()} MMK`,
    },
    {
      title: '每公里价格',
      dataIndex: 'pricePerKm',
      key: 'pricePerKm',
      render: (price) => `${price.toLocaleString()} MMK`,
    },
    {
      title: '每公斤价格',
      dataIndex: 'pricePerKg',
      key: 'pricePerKg',
      render: (price) => `${price.toLocaleString()} MMK`,
    },
    {
      title: '最大距离',
      dataIndex: 'maxDistance',
      key: 'maxDistance',
      render: (distance) => `${distance} km`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Switch checked={isActive} size="small" disabled />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditPrice(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePrice(record.key)}
          />
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<AdminUser> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          {username}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => roleLabels[role as keyof typeof roleLabels],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Switch checked={status === 'active'} size="small" disabled />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record.key)}
          />
        </Space>
      ),
    },
  ];

  const handleEditPrice = (price: PriceRule) => {
    setEditingPrice(price);
    setPriceModalVisible(true);
  };

  const handleDeletePrice = (key: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个价格规则吗？',
      onOk: () => {
        setPriceRules(priceRules.filter(p => p.key !== key));
        message.success('删除成功');
      },
    });
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserModalVisible(true);
  };

  const handleDeleteUser = (key: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个管理员吗？',
      onOk: () => {
        setAdminUsers(adminUsers.filter(u => u.key !== key));
        message.success('删除成功');
      },
    });
  };

  const handleSystemSettingsSave = (values: any) => {
    console.log('System settings saved:', values);
    message.success('系统设置保存成功');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>系统设置</Title>
        <Text type="secondary">配置系统参数、价格规则和管理员权限</Text>
      </div>

      {/* System Configuration */}
      <Card title="系统配置" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSystemSettingsSave}
          initialValues={{
            companyName: 'MARKET LINK EXPRESS',
            companyPhone: '09-259369349',
            companyEmail: 'marketlink982@gmail.com',
            companyAddress: 'Chan Mya Tha Zi, Mandalay',
            orderTimeout: 30,
            deliveryRadius: 50,
            enableSms: true,
            enableEmail: true,
            autoAssign: false,
            currency: 'MMK',
            language: 'my',
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="companyName" label="公司名称">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="companyPhone" label="公司电话">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="companyEmail" label="公司邮箱">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="currency" label="默认货币">
                <Select>
                  <Select.Option value="MMK">缅甸元 (MMK)</Select.Option>
                  <Select.Option value="USD">美元 (USD)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="companyAddress" label="公司地址">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="orderTimeout" label="订单超时时间(分钟)">
                <InputNumber min={5} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="deliveryRadius" label="配送范围(公里)">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="language" label="系统语言">
                <Select>
                  <Select.Option value="zh">中文</Select.Option>
                  <Select.Option value="en">English</Select.Option>
                  <Select.Option value="my">မြန်မာ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="enableSms" label="启用短信通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="enableEmail" label="启用邮件通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="autoAssign" label="自动分配订单" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Price Rules */}
      <Card 
        title="价格规则" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPrice(null);
              setPriceModalVisible(true);
            }}
          >
            添加规则
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={priceColumns}
          dataSource={priceRules}
          pagination={false}
        />
      </Card>

      {/* Admin Users */}
      <Card 
        title="管理员账户" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null);
              setUserModalVisible(true);
            }}
          >
            添加管理员
          </Button>
        }
      >
        <Table
          columns={userColumns}
          dataSource={adminUsers}
          pagination={false}
        />
      </Card>

      {/* Price Rule Modal */}
      <Modal
        title={editingPrice ? '编辑价格规则' : '添加价格规则'}
        open={priceModalVisible}
        onCancel={() => setPriceModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          initialValues={editingPrice || {}}
          onFinish={(values) => {
            console.log('Price rule saved:', values);
            setPriceModalVisible(false);
            message.success('价格规则保存成功');
          }}
        >
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="basePrice" label="起步价(MMK)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxDistance" label="最大距离(km)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pricePerKm" label="每公里价格(MMK)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pricePerKg" label="每公斤价格(MMK)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" label="启用规则" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setPriceModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* User Modal */}
      <Modal
        title={editingUser ? '编辑管理员' : '添加管理员'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          initialValues={editingUser || {}}
          onFinish={(values) => {
            console.log('User saved:', values);
            setUserModalVisible(false);
            message.success('管理员信息保存成功');
          }}
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="super_admin">超级管理员</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="operator">操作员</Select.Option>
              <Select.Option value="finance">财务</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: !editingUser }]}>
            <Input.Password placeholder={editingUser ? "留空则不修改密码" : ""} />
          </Form.Item>
          <Form.Item name="status" label="账户状态" valuePropName="checked">
            <Switch checkedChildren="激活" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setUserModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemSettings;
