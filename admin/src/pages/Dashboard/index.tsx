import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tag, Spin, Alert, Descriptions, Badge, List } from 'antd';
import {
  BugOutlined,
  RocketOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface DashboardData {
  stats: {
    totalFrogs: number;
    totalTravels: number;
    activeTravels: number;
    totalBadgesUnlocked: number;
    totalFriendships: number;
  };
  services: {
    backend: 'healthy' | 'unhealthy';
    database: 'connected' | 'disconnected';
  };
  chains: {
    chainId: number;
    name: string;
    rpcStatus: 'connected' | 'timeout' | 'error';
    blockNumber?: number;
  }[];
  contracts: {
    name: string;
    address: string;
    isDeployed: boolean;
    version?: string;
  }[];
  recentDomainEvents: {
    id: string;
    aggregateType: string;
    aggregateId?: string | null;
    eventType: string;
    frogId?: number | null;
    travelId?: number | null;
    source?: string | null;
    occurredAt: string;
  }[];
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/dashboard');
      setData(response as unknown as DashboardData);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '加载仪表盘失败'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTag = (status: string) => {
    const isGood = status === 'healthy' || status === 'connected';
    return (
      <Tag
        icon={isGood ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        color={isGood ? 'success' : 'error'}
      >
        {status === 'healthy' || status === 'connected' ? '正常' : '异常'}
      </Tag>
    );
  };

  const renderChainStatus = (status: string) => {
    const colors: Record<string, string> = {
      connected: 'success',
      timeout: 'warning',
      error: 'error',
    };
    return <Badge status={colors[status] as 'success' | 'warning' | 'error'} text={status} />;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="青蛙总数"
              value={data?.stats.totalFrogs || 0}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="旅行总次数"
              value={data?.stats.totalTravels || 0}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中旅行"
              value={data?.stats.activeTravels || 0}
              prefix={<SyncOutlined spin={data?.stats.activeTravels ? true : false} />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="好友关系数"
              value={data?.stats.totalFriendships || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 服务状态 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="🔧 服务状态" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="后端服务">
                {renderStatusTag(data?.services.backend || 'unhealthy')}
              </Descriptions.Item>
              <Descriptions.Item label="数据库连接">
                {renderStatusTag(data?.services.database || 'disconnected')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="⛓️ 链状态" size="small">
            {data?.chains && data.chains.length > 0 ? (
              <Descriptions column={1} size="small">
                {data.chains.map((chain) => (
                  <Descriptions.Item key={chain.chainId} label={chain.name}>
                    {renderChainStatus(chain.rpcStatus)}
                    {chain.blockNumber && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
                        Block: {chain.blockNumber.toLocaleString()}
                      </span>
                    )}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <span style={{ color: '#888' }}>暂无链状态数据</span>
            )}
          </Card>
        </Col>
      </Row>

      {/* 合约状态 */}
      <Card title="📜 合约状态" size="small">
        {data?.contracts && data.contracts.length > 0 ? (
          <Row gutter={[16, 16]}>
            {data.contracts.map((contract) => (
              <Col xs={24} sm={12} lg={8} key={contract.name}>
                <Card size="small" style={{ background: '#2a2a2a' }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>{contract.name}</strong>
                    {contract.version && (
                      <Tag style={{ marginLeft: 8 }}>{contract.version}</Tag>
                    )}
                  </div>
                  <div className="address" style={{ fontSize: 11, color: '#888' }}>
                    {contract.address || '未部署'}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Tag color={contract.isDeployed ? 'success' : 'default'}>
                      {contract.isDeployed ? '已部署' : '未部署'}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <span style={{ color: '#888' }}>暂无合约数据</span>
        )}
      </Card>

      <Card title="🧾 最近关键事件" size="small" style={{ marginTop: 24 }}>
        {data?.recentDomainEvents && data.recentDomainEvents.length > 0 ? (
          <List
            size="small"
            dataSource={data.recentDomainEvents}
            renderItem={(event) => (
              <List.Item>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Tag color="blue">{event.eventType}</Tag>
                    <Tag>{event.aggregateType}</Tag>
                    {event.frogId !== null && event.frogId !== undefined && <Tag>frog:{event.frogId}</Tag>}
                    {event.travelId !== null && event.travelId !== undefined && <Tag>travel:{event.travelId}</Tag>}
                    {event.source && (
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {event.source}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    {new Date(event.occurredAt).toLocaleString()}
                  </span>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <span style={{ color: '#888' }}>暂无关键事件</span>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
