import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  List,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type SuggestionStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED';

interface CouncilRiskPolicyLevelStatus {
  riskLevel: RiskLevel;
  envEnabled: boolean;
  overrideEnabled: boolean;
  effectiveEnabled: boolean;
  reason: string;
}

interface CouncilRiskPolicySnapshot {
  levels: CouncilRiskPolicyLevelStatus[];
}

interface CouncilSuggestionAuditItem {
  id: string;
  title: string;
  focus: string;
  objective: string | null;
  rationale: string;
  status: SuggestionStatus;
  risk: {
    level: RiskLevel;
    reason: string;
  };
  dataSources: Array<{
    source: string;
    referenceId: string | null;
    freshness: string | null;
  }>;
  trace: {
    promptKitVersion: string;
    model: string;
    traceId: string;
  };
  response: {
    decision: 'ACCEPT' | 'REJECT' | 'DEFER' | null;
    note: string | null;
    respondedAt: string | null;
    respondedByActor: string | null;
  };
  audit: {
    createdByAppId: string;
    createdByActor: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CouncilSuggestionAuditResponse {
  total: number;
  items: CouncilSuggestionAuditItem[];
}

interface CouncilPolicyAuditItem {
  id: string;
  action: string;
  riskLevel: RiskLevel;
  actor: string | null;
  reason: string | null;
  requestId: string | null;
  source: string | null;
  occurredAt: string;
}

const riskLevelColor: Record<RiskLevel, string> = {
  LOW: 'green',
  MEDIUM: 'gold',
  HIGH: 'red',
};

const statusColor: Record<SuggestionStatus, string> = {
  OPEN: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  DEFERRED: 'gold',
};

const riskLabelMap: Record<RiskLevel, string> = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险',
};

const statusLabelMap: Record<SuggestionStatus, string> = {
  OPEN: '待处理',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  DEFERRED: '已延后',
};

const policyReasonLabelMap: Record<string, string> = {
  enabled: '已开启',
  policy_env_disabled: '环境开关关闭',
  policy_override_disabled: '策略开关关闭',
};

const auditActionLabelMap: Record<string, string> = {
  risk_level_enabled: '启用风险等级',
  risk_level_disabled: '暂停风险等级',
};

const riskLevelOptions: Array<{ label: string; value: RiskLevel }> = [
  { label: '低风险', value: 'LOW' },
  { label: '中风险', value: 'MEDIUM' },
  { label: '高风险', value: 'HIGH' },
];

const suggestionStatusOptions: Array<{ label: string; value: SuggestionStatus }> = [
  { label: '待处理', value: 'OPEN' },
  { label: '已接受', value: 'ACCEPTED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已延后', value: 'DEFERRED' },
];

const CouncilAudit: React.FC = () => {
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySnapshot, setPolicySnapshot] = useState<CouncilRiskPolicySnapshot | null>(null);
  const [togglingRiskLevel, setTogglingRiskLevel] = useState<RiskLevel | null>(null);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<CouncilSuggestionAuditResponse>({ total: 0, items: [] });
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | undefined>(undefined);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | undefined>(undefined);
  const [appIdFilter, setAppIdFilter] = useState('');

  const [policyAuditLoading, setPolicyAuditLoading] = useState(false);
  const [policyAuditError, setPolicyAuditError] = useState<string | null>(null);
  const [policyAuditItems, setPolicyAuditItems] = useState<CouncilPolicyAuditItem[]>([]);

  const fetchPolicy = useCallback(async () => {
    try {
      setPolicyLoading(true);
      const payload = (await api.get('/api/admin/v3/council/policy')) as CouncilRiskPolicySnapshot;
      setPolicySnapshot(payload);
      setPolicyError(null);
    } catch (error) {
      setPolicyError(getApiErrorMessage(error, '加载 Council 风险策略失败'));
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const fetchSuggestionAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const query = new URLSearchParams();
      query.set('limit', '20');
      if (statusFilter) {
        query.set('status', statusFilter);
      }
      if (riskFilter) {
        query.set('riskLevel', riskFilter);
      }
      if (appIdFilter.trim()) {
        query.set('appId', appIdFilter.trim());
      }
      const payload = (await api.get(
        `/api/admin/v3/council/audit?${query.toString()}`
      )) as CouncilSuggestionAuditResponse;
      setAuditData(payload);
      setAuditError(null);
    } catch (error) {
      setAuditError(getApiErrorMessage(error, '加载 Council 建议审计失败'));
    } finally {
      setAuditLoading(false);
    }
  }, [appIdFilter, riskFilter, statusFilter]);

  const fetchPolicyAudit = useCallback(async () => {
    try {
      setPolicyAuditLoading(true);
      const payload = (await api.get('/api/admin/v3/council/policy/audit?limit=20')) as {
        items: CouncilPolicyAuditItem[];
      };
      setPolicyAuditItems(payload.items || []);
      setPolicyAuditError(null);
    } catch (error) {
      setPolicyAuditError(getApiErrorMessage(error, '加载 Council 策略审计失败'));
    } finally {
      setPolicyAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
    fetchSuggestionAudit();
    fetchPolicyAudit();
  }, [fetchPolicy, fetchSuggestionAudit, fetchPolicyAudit]);

  const policyLevels = useMemo(() => policySnapshot?.levels || [], [policySnapshot]);

  const handleToggleRiskLevel = async (riskLevel: RiskLevel, active: boolean) => {
    try {
      setTogglingRiskLevel(riskLevel);
      const payload = (await api.post(
        `/api/admin/v3/council/policy/risk-levels/${riskLevel.toLowerCase()}/toggle`,
        {
          active,
          reason: active
            ? `admin-council-audit-enable-${riskLevel.toLowerCase()}`
            : `admin-council-audit-disable-${riskLevel.toLowerCase()}`,
        }
      )) as CouncilRiskPolicySnapshot;
      setPolicySnapshot(payload);
      setPolicyError(null);
      await Promise.all([fetchPolicyAudit(), fetchSuggestionAudit()]);
      message.success(active ? `${riskLabelMap[riskLevel]}建议已启用` : `${riskLabelMap[riskLevel]}建议已暂停`);
    } catch (error) {
      const nextError = getApiErrorMessage(error, `更新 ${riskLabelMap[riskLevel]}策略失败`);
      setPolicyError(nextError);
      message.error(nextError);
    } finally {
      setTogglingRiskLevel(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {policyError ? (
        <Alert type="error" showIcon message="Council 风险策略加载失败" description={policyError} />
      ) : null}

      <Card
        title="Council 风险安全门"
        extra={(
          <Button
            icon={<ReloadOutlined />}
            loading={policyLoading || togglingRiskLevel !== null}
            onClick={fetchPolicy}
          >
            刷新
          </Button>
        )}
        loading={policyLoading && !policySnapshot}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          可按风险等级暂停建议生成；被暂停的等级会在 `/api/v3/council/suggestions` 创建阶段直接 fail-closed。
        </Typography.Paragraph>

        <List
          dataSource={policyLevels}
          locale={{ emptyText: '暂无风险等级策略' }}
          renderItem={(item) => (
            <List.Item>
              <Space size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size={8} wrap>
                  <Tag color={riskLevelColor[item.riskLevel]}>{riskLabelMap[item.riskLevel]}</Tag>
                  <Tag color={item.envEnabled ? 'blue' : 'default'}>
                    env {item.envEnabled ? 'on' : 'off'}
                  </Tag>
                  <Tag color={item.overrideEnabled ? 'green' : 'orange'}>
                    policy {item.overrideEnabled ? 'on' : 'off'}
                  </Tag>
                  <Tag color={item.effectiveEnabled ? 'success' : 'error'}>
                    {item.effectiveEnabled ? 'ACTIVE' : 'BLOCKED'}
                  </Tag>
                  <Typography.Text type="secondary">
                    {policyReasonLabelMap[item.reason] || item.reason}
                  </Typography.Text>
                </Space>
                <Switch
                  checked={item.overrideEnabled}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  disabled={Boolean(togglingRiskLevel)}
                  loading={togglingRiskLevel === item.riskLevel}
                  onChange={(checked) => handleToggleRiskLevel(item.riskLevel, checked)}
                />
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {auditError ? (
        <Alert type="error" showIcon message="Council 建议审计加载失败" description={auditError} />
      ) : null}

      <Card
        title="Council 建议审计"
        extra={(
          <Button icon={<ReloadOutlined />} loading={auditLoading} onClick={fetchSuggestionAudit}>
            刷新
          </Button>
        )}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            allowClear
            placeholder="按状态过滤"
            style={{ width: 160 }}
            options={suggestionStatusOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
          />
          <Select
            allowClear
            placeholder="按风险过滤"
            style={{ width: 160 }}
            options={riskLevelOptions}
            value={riskFilter}
            onChange={(value) => setRiskFilter(value)}
          />
          <Input
            placeholder="按 appId 过滤（可选）"
            style={{ width: 220 }}
            value={appIdFilter}
            onChange={(event) => setAppIdFilter(event.target.value)}
          />
          <Button type="primary" loading={auditLoading} onClick={fetchSuggestionAudit}>
            应用筛选
          </Button>
        </Space>

        <Typography.Paragraph type="secondary">
          共 {auditData.total} 条建议（当前展示 {auditData.items.length} 条）
        </Typography.Paragraph>

        <List
          loading={auditLoading}
          dataSource={auditData.items}
          locale={{ emptyText: '暂无建议审计记录' }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space wrap size={8}>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Tag color={statusColor[item.status]}>{statusLabelMap[item.status]}</Tag>
                  <Tag color={riskLevelColor[item.risk.level]}>{riskLabelMap[item.risk.level]}</Tag>
                  <Typography.Text type="secondary">
                    {new Date(item.updatedAt).toLocaleString()}
                  </Typography.Text>
                </Space>

                <Typography.Text>
                  focus: {item.focus}
                </Typography.Text>
                <Typography.Text type="secondary">
                  app: {item.audit.createdByAppId} | promptKit: {item.trace.promptKitVersion} | model: {item.trace.model}
                </Typography.Text>
                <Typography.Text type="secondary">
                  dataSources: {item.dataSources.map((source) => source.source).join(', ') || '-'}
                </Typography.Text>
                <Typography.Text type="secondary">
                  result: {item.response.decision || '-'}
                  {item.response.note ? ` | note: ${item.response.note}` : ''}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {policyAuditError ? (
        <Alert type="error" showIcon message="Council 策略审计加载失败" description={policyAuditError} />
      ) : null}

      <Card
        title="策略变更审计"
        extra={(
          <Button icon={<ReloadOutlined />} loading={policyAuditLoading} onClick={fetchPolicyAudit}>
            刷新
          </Button>
        )}
      >
        <List
          loading={policyAuditLoading}
          dataSource={policyAuditItems}
          locale={{ emptyText: '暂无策略审计记录' }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={8} wrap>
                  <Tag color={item.action === 'risk_level_disabled' ? 'red' : 'green'}>
                    {auditActionLabelMap[item.action] || item.action}
                  </Tag>
                  <Tag color={riskLevelColor[item.riskLevel]}>{riskLabelMap[item.riskLevel]}</Tag>
                  <Typography.Text type="secondary">
                    {new Date(item.occurredAt).toLocaleString()}
                  </Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  actor: {item.actor || 'system'} | requestId: {item.requestId || '-'}
                </Typography.Text>
                {item.reason ? <Typography.Text type="secondary">reason: {item.reason}</Typography.Text> : null}
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
};

export default CouncilAudit;
