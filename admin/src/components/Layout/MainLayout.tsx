import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  ApiOutlined,
  BugOutlined,
  TrophyOutlined,
  TeamOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/contracts', icon: <ApiOutlined />, label: '合约管理' },
  { key: '/frogs', icon: <BugOutlined />, label: '青蛙管理' },
  { key: '/badges', icon: <TrophyOutlined />, label: '徽章管理' },
  { key: '/friends', icon: <TeamOutlined />, label: '好友管理' },
  { key: '/travels', icon: <RocketOutlined />, label: '旅行管理' },
  { key: '/config', icon: <SettingOutlined />, label: '系统配置' },
];

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/contracts': '合约管理',
  '/frogs': '青蛙管理',
  '/badges': '徽章管理',
  '/friends': '好友管理',
  '/travels': '旅行管理',
  '/config': '系统配置',
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const pageTitle = pageTitles[currentPath] || 'ZetaFrog Admin';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: '#1f1f1f',
          borderRight: '1px solid #303030',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #303030',
          }}
        >
          <span
            style={{
              fontSize: collapsed ? 18 : 20,
              fontWeight: 'bold',
              color: '#10b981',
            }}
          >
            {collapsed ? '🐸' : '🐸 ZetaFrog Admin'}
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            borderRight: 'none',
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#1f1f1f',
            borderBottom: '1px solid #303030',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {pageTitle}
          </h1>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#1f1f1f',
            borderRadius: 8,
            minHeight: 'calc(100vh - 112px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
