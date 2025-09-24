import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Button,
  Typography,
  Space,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Transaction {
  key: string;
  id: string;
  type: 'income' | 'expense' | 'commission';
  amount: number;
  description: string;
  orderId?: string;
  courierId?: string;
  courierName?: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const revenueData = [
  { month: '1月', income: 2400000, expense: 800000, profit: 1600000 },
  { month: '2月', income: 2800000, expense: 900000, profit: 1900000 },
  { month: '3月', income: 3200000, expense: 1000000, profit: 2200000 },
  { month: '4月', income: 2900000, expense: 950000, profit: 1950000 },
  { month: '5月', income: 3500000, expense: 1100000, profit: 2400000 },
  { month: '6月', income: 3800000, expense: 1200000, profit: 2600000 },
];

const mockTransactions: Transaction[] = [
  {
    key: '1',
    id: 'T001234',
    type: 'income',
    amount: 15000,
    description: '订单收入',
    orderId: 'ML001234',
    date: '2024-01-15 10:30:00',
    status: 'completed',
  },
  {
    key: '2',
    id: 'T001235',
    type: 'commission',
    amount: -4500,
    description: '快递员佣金',
    orderId: 'ML001234',
    courierId: 'C001',
    courierName: '李师傅',
    date: '2024-01-15 10:35:00',
    status: 'completed',
  },
  {
    key: '3',
    id: 'T001236',
    type: 'expense',
    amount: -2000,
    description: '燃油补贴',
    courierId: 'C002',
    courierName: '王师傅',
    date: '2024-01-15 09:00:00',
    status: 'completed',
  },
];

const FinanceManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const typeColors = {
    income: 'green',
    expense: 'red',
    commission: 'orange',
  };

  const typeLabels = {
    income: '收入',
    expense: '支出',
    commission: '佣金',
  };

  const statusColors = {
    completed: 'green',
    pending: 'orange',
    cancelled: 'red',
  };

  const statusLabels = {
    completed: '已完成',
    pending: '待处理',
    cancelled: '已取消',
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '交易ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={typeColors[type as keyof typeof typeColors]}>
          {typeLabels[type as keyof typeof typeLabels]}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <Text 
          strong 
          style={{ 
            color: amount > 0 ? '#52c41a' : '#f5222d' 
          }}
        >
          {amount > 0 ? '+' : ''}{amount.toLocaleString()} MMK
        </Text>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '关联订单',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 100,
      render: (orderId) => orderId || '-',
    },
    {
      title: '快递员',
      dataIndex: 'courierName',
      key: 'courierName',
      width: 100,
      render: (courierName) => courierName || '-',
    },
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (date) => dayjs(date).format('MM-DD HH:mm'),
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
  ];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    let matchesDate = true;
    if (dateRange) {
      const transactionDate = dayjs(transaction.date);
      matchesDate = transactionDate.isAfter(dateRange[0]) && transactionDate.isBefore(dateRange[1]);
    }
    
    return matchesType && matchesDate;
  });

  // Calculate statistics
  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = Math.abs(transactions
    .filter(t => (t.type === 'expense' || t.type === 'commission') && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0));
    
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>财务管理</Title>
        <Text type="secondary">管理收入支出，查看财务报表和快递员佣金</Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总收入"
              value={totalIncome}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
              suffix="MMK"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总支出"
              value={totalExpense}
              precision={0}
              valueStyle={{ color: '#f5222d' }}
              prefix={<FallOutlined />}
              suffix="MMK"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="净利润"
              value={netProfit}
              precision={0}
              valueStyle={{ color: netProfit >= 0 ? '#52c41a' : '#f5222d' }}
              prefix={<DollarOutlined />}
              suffix="MMK"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="利润率"
              value={profitMargin}
              precision={1}
              valueStyle={{ color: profitMargin >= 0 ? '#52c41a' : '#f5222d' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="收入趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} MMK`, '']} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#52c41a" 
                  strokeWidth={2}
                  name="收入"
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#f5222d" 
                  strokeWidth={2}
                  name="支出"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  name="利润"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="月度对比">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData.slice(-3)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} MMK`, '']} />
                <Bar dataKey="profit" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="交易类型"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">全部类型</Select.Option>
              <Select.Option value="income">收入</Select.Option>
              <Select.Option value="expense">支出</Select.Option>
              <Select.Option value="commission">佣金</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Space>
              <Button type="primary" icon={<DownloadOutlined />}>
                导出报表
              </Button>
              <Button>佣金结算</Button>
              <Button>添加记录</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Transactions Table */}
      <Card title="交易记录">
        <Table
          columns={columns}
          dataSource={filteredTransactions}
          loading={loading}
          pagination={{
            total: filteredTransactions.length,
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

export default FinanceManagement;
