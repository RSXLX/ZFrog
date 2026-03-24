import React, { useMemo, useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  ApiOutlined,
  BugOutlined,
  TrophyOutlined,
  TeamOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  FireOutlined,
  BookOutlined,
  LinkOutlined,
  PoweroffOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { isRelationshipGraphAdminBetaEnabled } from '../../features/relationship-graph/runtime';
import { isV3DashboardAdminBetaEnabled } from '../../features/v3-dashboard/runtime';

const { Sider, Content, Header } = Layout;

const baseMenuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/contracts', icon: <ApiOutlined />, label: '合约管理' },
  { key: '/frogs', icon: <BugOutlined />, label: '青蛙管理' },
  { key: '/badges', icon: <TrophyOutlined />, label: '徽章管理' },
  { key: '/friends', icon: <TeamOutlined />, label: '好友管理' },
  { key: '/travels', icon: <RocketOutlined />, label: '旅行管理' },
  { key: '/verifications', icon: <SafetyCertificateOutlined />, label: '验证观测' },
  { key: '/attestations', icon: <LinkOutlined />, label: '关系证明' },
  { key: '/rituals', icon: <FireOutlined />, label: '仪式观测' },
  { key: '/memory-palaces', icon: <BookOutlined />, label: '记忆宫殿' },
  { key: '/v3-ops', icon: <PoweroffOutlined />, label: 'V3 Runtime' },
  { key: '/council-audit', icon: <AuditOutlined />, label: 'Council 审计' },
  { key: '/creators', icon: <AuditOutlined />, label: 'Creator 审核' },
  { key: '/partners', icon: <AuditOutlined />, label: 'Partner Campaign' },
  { key: '/config', icon: <SettingOutlined />, label: '系统配置' },
];

const relationshipGraphMenuItem = {
  key: '/relationship-graph',
  icon: <AuditOutlined />,
  label: 'Relationship Graph',
};

const v3DashboardMenuItem = {
  key: '/v3-dashboard',
  icon: <AppstoreOutlined />,
  label: 'V3 Dashboard',
};

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/contracts': '合约管理',
  '/frogs': '青蛙管理',
  '/badges': '徽章管理',
  '/friends': '好友管理',
  '/travels': '旅行管理',
  '/verifications': '验证观测',
  '/attestations': '关系证明',
  '/rituals': '仪式观测',
  '/memory-palaces': '记忆宫殿',
  '/v3-ops': 'V3 Runtime',
  '/council-audit': 'Council 审计',
  '/creators': 'Creator 审核',
  '/partners': 'Partner Campaign',
  '/relationship-graph': 'Relationship Graph',
  '/v3-dashboard': 'V3 Dashboard',
  '/config': '系统配置',
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const relationshipGraphEnabled = useMemo(() => isRelationshipGraphAdminBetaEnabled(), []);
  const v3DashboardEnabled = useMemo(() => isV3DashboardAdminBetaEnabled(), []);

  const currentPath = location.pathname;
  const selectedMenuKey = currentPath.startsWith('/relationship-graph')
    ? '/relationship-graph'
    : currentPath;
  const pageTitle =
    currentPath.startsWith('/relationship-graph')
      ? pageTitles['/relationship-graph']
      : pageTitles[currentPath] || 'ZetaFrog Admin';
  const menuItems = useMemo(() => {
    if (!relationshipGraphEnabled && !v3DashboardEnabled) {
      return baseMenuItems;
    }

    const configItem = baseMenuItems.find((item) => item.key === '/config');
    const withoutConfig = baseMenuItems.filter((item) => item.key !== '/config');
    const appended = [...withoutConfig];

    if (v3DashboardEnabled) {
      appended.push(v3DashboardMenuItem);
    }

    if (relationshipGraphEnabled) {
      appended.push(relationshipGraphMenuItem);
    }

    return configItem ? [...appended, configItem] : appended;
  }, [relationshipGraphEnabled, v3DashboardEnabled]);

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
          selectedKeys={[selectedMenuKey]}
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
