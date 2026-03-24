import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  List,
  Row,
  Space,
  Statistic,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';
import { isV3DashboardAdminBetaEnabled } from '../../features/v3-dashboard/runtime';

type V3Module = 'journey' | 'council' | 'memory' | 'creator' | 'partner' | 'relationshipGraph';
type RuntimeReason =
  | 'enabled'
  | 'runtime_disabled'
  | 'kill_switch_active'
  | 'module_env_disabled'
  | 'module_override_disabled';

type CreatorPackStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type PartnerCampaignStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
type MemoryTemplateStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type CouncilSuggestionStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED';
type CouncilRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface RuntimeModuleStatus {
  module: V3Module;
  envEnabled: boolean;
  overrideEnabled: boolean;
  effectiveEnabled: boolean;
  reason: RuntimeReason;
}

interface RuntimeStatus {
  enabled: boolean;
  effectiveEnabled: boolean;
  killSwitchActive: boolean;
  modules: RuntimeModuleStatus[];
}

interface CreatorReviewQueueResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    status: CreatorPackStatus;
    updatedAt: string;
  }>;
}

interface PartnerCampaignListResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    status: PartnerCampaignStatus;
    updatedAt: string;
  }>;
}

interface MemoryTemplateReviewResponse {
  total: number;
  items: Array<{
    id: string;
    name: string;
    status: MemoryTemplateStatus;
    updatedAt: string;
    featureEnabled: boolean;
  }>;
}

interface CouncilAuditResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    status: CouncilSuggestionStatus;
    risk: {
      level: CouncilRiskLevel;
    };
    updatedAt: string;
  }>;
}

const moduleLabelMap: Record<V3Module, string> = {
  journey: 'Journey',
  council: 'Council',
  memory: 'Memory World',
  creator: 'Creator',
  partner: 'Partner',
  relationshipGraph: 'Relationship Graph',
};

const moduleRouteMap: Partial<Record<V3Module, string>> = {
  journey: '/travels',
  council: '/council-audit',
  memory: '/memory-palaces',
  creator: '/creators',
  partner: '/partners',
  relationshipGraph: '/relationship-graph',
};

const runtimeReasonLabelMap: Record<RuntimeReason, string> = {
  enabled: '已开启',
  runtime_disabled: 'V3 runtime 关闭',
  kill_switch_active: 'Kill switch 生效',
  module_env_disabled: '模块环境开关关闭',
  module_override_disabled: '模块策略暂停',
};

const creatorStatusColorMap: Record<CreatorPackStatus, string> = {
  DRAFT: 'default',
  IN_REVIEW: 'processing',
  PUBLISHED: 'success',
  REJECTED: 'error',
  ARCHIVED: 'purple',
};

const partnerStatusColorMap: Record<PartnerCampaignStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'purple',
};

const templateStatusColorMap: Record<MemoryTemplateStatus, string> = {
  DRAFT: 'default',
  IN_REVIEW: 'processing',
  PUBLISHED: 'success',
  REJECTED: 'error',
  ARCHIVED: 'purple',
};

const councilRiskColorMap: Record<CouncilRiskLevel, string> = {
  LOW: 'green',
  MEDIUM: 'gold',
  HIGH: 'red',
};

const APP_ID_PATTERN = /^[a-zA-Z0-9_:-]{2,80}$/;
const FROG_ID_PATTERN = /^[1-9][0-9]*$/;

const V3DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const betaEnabled = useMemo(() => isV3DashboardAdminBetaEnabled(), []);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [creatorQueue, setCreatorQueue] = useState<CreatorReviewQueueResponse | null>(null);
  const [partnerPublished, setPartnerPublished] = useState<PartnerCampaignListResponse | null>(null);
  const [partnerPaused, setPartnerPaused] = useState<PartnerCampaignListResponse | null>(null);
  const [memoryReviewQueue, setMemoryReviewQueue] = useState<MemoryTemplateReviewResponse | null>(null);
  const [councilOpenQueue, setCouncilOpenQueue] = useState<CouncilAuditResponse | null>(null);

  const [moduleMutating, setModuleMutating] = useState<V3Module | null>(null);
  const [graphAppId, setGraphAppId] = useState('');
  const [graphFrogId, setGraphFrogId] = useState('');

  const runtimeModuleMap = useMemo(() => {
    return new Map((runtimeStatus?.modules || []).map((item) => [item.module, item]));
  }, [runtimeStatus]);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const [runtimePayload, creatorsPayload, partnerPublishedPayload, partnerPausedPayload, memoryPayload, councilPayload] =
        await Promise.all([
          api.get('/api/admin/v3/runtime/status') as Promise<RuntimeStatus>,
          api.get('/api/admin/v3/creators/review-queue?status=IN_REVIEW&limit=5') as Promise<CreatorReviewQueueResponse>,
          api.get('/api/admin/v3/partners/campaigns?status=PUBLISHED&limit=5') as Promise<PartnerCampaignListResponse>,
          api.get('/api/admin/v3/partners/campaigns?status=PAUSED&limit=5') as Promise<PartnerCampaignListResponse>,
          api.get('/api/admin/v3/memory-palaces/templates/review?status=IN_REVIEW&limit=5') as Promise<MemoryTemplateReviewResponse>,
          api.get('/api/admin/v3/council/audit?status=OPEN&limit=5') as Promise<CouncilAuditResponse>,
        ]);

      setRuntimeStatus(runtimePayload);
      setCreatorQueue(creatorsPayload);
      setPartnerPublished(partnerPublishedPayload);
      setPartnerPaused(partnerPausedPayload);
      setMemoryReviewQueue(memoryPayload);
      setCouncilOpenQueue(councilPayload);
      setLoadError(null);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, '加载 V3 Dashboard 总览失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!betaEnabled) {
      return;
    }
    void loadOverview();
  }, [betaEnabled, loadOverview]);

  const toggleRuntimeModule = useCallback(async (module: V3Module, active: boolean) => {
    try {
      setModuleMutating(module);
      const payload = (await api.post(`/api/admin/v3/runtime/modules/${module}/toggle`, {
        active,
        reason: active
          ? `admin-v3-dashboard-enable-module-${module}`
          : `admin-v3-dashboard-disable-module-${module}`,
      })) as RuntimeStatus;

      setRuntimeStatus(payload);
      message.success(active ? `${moduleLabelMap[module]} 模块已恢复` : `${moduleLabelMap[module]} 模块已暂停`);
    } catch (error) {
      message.error(getApiErrorMessage(error, `更新 ${moduleLabelMap[module]} 模块状态失败`));
    } finally {
      setModuleMutating(null);
    }
  }, []);

  const handleGraphJump = useCallback(() => {
    const appId = graphAppId.trim();
    const frogId = graphFrogId.trim();

    if (!APP_ID_PATTERN.test(appId)) {
      message.error('appId 格式不合法，必须匹配 [a-zA-Z0-9_:-]{2,80}');
      return;
    }

    if (!FROG_ID_PATTERN.test(frogId)) {
      message.error('frogId 必须是正整数');
      return;
    }

    navigate(`/relationship-graph/${encodeURIComponent(appId)}/${frogId}`);
  }, [graphAppId, graphFrogId, navigate]);

  if (!betaEnabled) {
    return (
      <Alert
        type="warning"
        showIcon
        message="V3 Dashboard Beta 入口已关闭"
        description="当前 beta gate 为关闭状态。若需启用，请打开 VITE_V3_DASHBOARD_BETA_ENABLED。"
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="V3 Dashboard 加载失败"
          description={loadError}
        />
      ) : null}

      <Card
        title="V3 Beta 运营总控看板"
        extra={(
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => {
              void loadOverview();
            }}
          >
            刷新
          </Button>
        )}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          聚合 creator / partner / world / council / relationship graph 五类运营读模型，并在同页提供模块暂停入口。
        </Typography.Paragraph>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={8}>
            <Card size="small" title="Creator 审核队列" extra={<Tag color="processing">IN_REVIEW</Tag>}>
              <Statistic value={creatorQueue?.total || 0} suffix="packs" />
              <List
                size="small"
                style={{ marginTop: 12 }}
                locale={{ emptyText: '暂无待审核 pack' }}
                dataSource={creatorQueue?.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Typography.Text>{item.title}</Typography.Text>
                      <Space size={8}>
                        <Tag color={creatorStatusColorMap[item.status]}>{item.status}</Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(item.updatedAt).toLocaleString()}
                        </Typography.Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
              <Button block style={{ marginTop: 12 }} onClick={() => navigate('/creators')}>
                前往 Creator 审核
              </Button>
            </Card>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Card
              size="small"
              title="Partner Campaign"
              extra={<Tag color="success">PUBLISHED / PAUSED</Tag>}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Statistic title="已发布" value={partnerPublished?.total || 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="已暂停" value={partnerPaused?.total || 0} />
                </Col>
              </Row>
              <List
                size="small"
                style={{ marginTop: 12 }}
                locale={{ emptyText: '暂无活动' }}
                dataSource={partnerPublished?.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Typography.Text>{item.title}</Typography.Text>
                      <Space size={8}>
                        <Tag color={partnerStatusColorMap[item.status]}>{item.status}</Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(item.updatedAt).toLocaleString()}
                        </Typography.Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
              <Button block style={{ marginTop: 12 }} onClick={() => navigate('/partners')}>
                前往 Partner 管理
              </Button>
            </Card>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Card size="small" title="Memory World 模板审核" extra={<Tag color="blue">IN_REVIEW</Tag>}>
              <Statistic value={memoryReviewQueue?.total || 0} suffix="templates" />
              <List
                size="small"
                style={{ marginTop: 12 }}
                locale={{ emptyText: '暂无待审模板' }}
                dataSource={memoryReviewQueue?.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Typography.Text>{item.name}</Typography.Text>
                      <Space size={8}>
                        <Tag color={templateStatusColorMap[item.status]}>{item.status}</Tag>
                        <Tag color={item.featureEnabled ? 'success' : 'default'}>
                          feature {item.featureEnabled ? 'on' : 'off'}
                        </Tag>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
              <Button block style={{ marginTop: 12 }} onClick={() => navigate('/memory-palaces')}>
                前往 Memory 管理
              </Button>
            </Card>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Card size="small" title="Council 待处理建议" extra={<Tag color="processing">OPEN</Tag>}>
              <Statistic value={councilOpenQueue?.total || 0} suffix="suggestions" />
              <List
                size="small"
                style={{ marginTop: 12 }}
                locale={{ emptyText: '暂无待处理建议' }}
                dataSource={councilOpenQueue?.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Typography.Text>{item.title}</Typography.Text>
                      <Space size={8}>
                        <Tag color={councilRiskColorMap[item.risk.level]}>{item.risk.level}</Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(item.updatedAt).toLocaleString()}
                        </Typography.Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
              <Button block style={{ marginTop: 12 }} onClick={() => navigate('/council-audit')}>
                前往 Council 审计
              </Button>
            </Card>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Card size="small" title="Relationship Graph 观测入口" extra={<Tag color="purple">READ ONLY</Tag>}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                  通过 appId + frogId 快速跳转图谱详情，并可联动模块暂停开关。
                </Typography.Text>
                <Input
                  value={graphAppId}
                  onChange={(event) => setGraphAppId(event.target.value)}
                  placeholder="appId, e.g. int_rel_main"
                />
                <Input
                  value={graphFrogId}
                  onChange={(event) => setGraphFrogId(event.target.value)}
                  placeholder="frogId, e.g. 901"
                />
                <Button type="primary" onClick={handleGraphJump}>
                  打开 Relationship Graph
                </Button>
                <Tag
                  color={runtimeModuleMap.get('relationshipGraph')?.effectiveEnabled ? 'success' : 'error'}
                >
                  runtime: {runtimeModuleMap.get('relationshipGraph')?.effectiveEnabled ? 'ACTIVE' : 'BLOCKED'}
                </Tag>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="模块暂停入口（Runtime Override）" loading={loading && !runtimeStatus}>
        <List
          dataSource={runtimeStatus?.modules || []}
          locale={{ emptyText: '暂无 runtime 模块状态' }}
          renderItem={(item) => (
            <List.Item>
              <Space size={12} style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <Space size={8} wrap>
                  <Typography.Text strong>{moduleLabelMap[item.module]}</Typography.Text>
                  <Tag color={item.effectiveEnabled ? 'success' : 'error'}>
                    {item.effectiveEnabled ? 'ACTIVE' : 'BLOCKED'}
                  </Tag>
                  <Tag color={item.envEnabled ? 'blue' : 'default'}>
                    env {item.envEnabled ? 'on' : 'off'}
                  </Tag>
                  <Typography.Text type="secondary">
                    {runtimeReasonLabelMap[item.reason]}
                  </Typography.Text>
                </Space>
                <Space size={8} wrap>
                  <Switch
                    checked={item.overrideEnabled}
                    checkedChildren="模块开"
                    unCheckedChildren="模块关"
                    loading={moduleMutating === item.module}
                    disabled={Boolean(moduleMutating)}
                    onChange={(checked) => {
                      void toggleRuntimeModule(item.module, checked);
                    }}
                  />
                  {moduleRouteMap[item.module] ? (
                    <Button
                      size="small"
                      onClick={() => {
                        navigate(moduleRouteMap[item.module] as string);
                      }}
                    >
                      进入模块页
                    </Button>
                  ) : null}
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
};

export default V3DashboardPage;
