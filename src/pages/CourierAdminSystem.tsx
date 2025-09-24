import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Badge,
  Button,
  Space,
  Typography,
  ConfigProvider,
  theme as antTheme,
} from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher, { LanguageType } from '../components/LanguageSwitcher';

// Import admin modules
import CourierDashboard from '../components/courier-admin/CourierDashboard';
import OrderManagement from '../components/courier-admin/OrderManagement';
import UserManagement from '../components/courier-admin/UserManagement';
import CourierManagement from '../components/courier-admin/CourierManagement';
import FinanceManagement from '../components/courier-admin/FinanceManagement';
import SystemSettings from '../components/courier-admin/SystemSettings';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operator' | 'finance';
  avatar?: string;
}

const CourierAdminSystem: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const { language, setLanguage, t } = useLanguage();

  // Mock admin user data
  useEffect(() => {
    // In real app, this would come from authentication
    setAdminUser({
      id: '1',
      username: 'Admin User',
      email: 'admin@marketlink.com',
      role: 'super_admin',
      avatar: undefined,
    });
  }, []);

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: 'couriers',
      icon: <CarOutlined />,
      label: '快递员管理',
    },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: '财务管理',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = (key: string) => {
    setSelectedKey(key);
  };

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      // Handle logout
      console.log('Logout clicked');
    }
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return <CourierDashboard />;
      case 'orders':
        return <OrderManagement />;
      case 'users':
        return <UserManagement />;
      case 'couriers':
        return <CourierManagement />;
      case 'finance':
        return <FinanceManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <CourierDashboard />;
    }
  };

  if (!adminUser) {
    return <div>Loading...</div>;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1976d2',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#f5222d',
          colorInfo: '#1890ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          style={{
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Logo */}
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            margin: '16px',
            borderRadius: '8px',
          }}>
            <Title 
              level={4} 
              style={{ 
                color: 'white', 
                margin: 0,
                fontSize: collapsed ? '16px' : '18px',
                transition: 'all 0.2s',
              }}
            >
              {collapsed ? 'ML' : 'MARKET LINK'}
            </Title>
          </div>

          {/* Menu */}
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ 
              background: 'transparent', 
              border: 'none',
            }}
            theme="dark"
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
          />
        </Sider>

        <Layout>
          {/* Header */}
          <Header 
            style={{ 
              padding: '0 24px',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 1,
            }}
          >
            {/* Left side */}
            <Space>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: 40,
                  height: 40,
                }}
              />
              <Title level={4} style={{ margin: 0, color: '#1976d2' }}>
                缅甸同城快递管理系统
              </Title>
            </Space>

            {/* Right side */}
            <Space size="large">
              {/* Language Switcher */}
              <LanguageSwitcher
                currentLanguage={language as LanguageType}
                onLanguageChange={setLanguage}
                variant="admin"
              />

              {/* Notifications */}
              <Badge count={5} size="small">
                <Button 
                  type="text" 
                  icon={<BellOutlined />} 
                  style={{ fontSize: '16px' }}
                />
              </Badge>

              {/* User Menu */}
              <Dropdown 
                menu={{ 
                  items: userMenuItems, 
                  onClick: handleUserMenuClick 
                }}
                placement="bottomRight"
              >
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar 
                    size="default" 
                    icon={<UserOutlined />}
                    src={adminUser.avatar}
                    style={{ backgroundColor: '#1976d2' }}
                  />
                  <span style={{ color: '#333' }}>{adminUser.username}</span>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          {/* Content */}
          <Content 
            style={{
              margin: '24px',
              padding: '24px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minHeight: 'calc(100vh - 112px)',
              overflow: 'auto',
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default CourierAdminSystem;
