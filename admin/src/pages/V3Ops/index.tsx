import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, List, Space, Switch, Tag, Typography, message } from 'antd';
import { PoweroffOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface RuntimeModuleStatus {
  module: string;
  envEnabled: boolean;
  overrideEnabled: boolean;
  effectiveEnabled: boolean;
  reason: string;
}

interface RuntimeModuleOverride {
  module: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

interface RuntimeStatus {
  enabled: boolean;
  effectiveEnabled: boolean;
  killSwitchActive: boolean;
  env: {
    enabled: boolean;
    killSwitchActive: boolean;
  };
  override: {
    active: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
    reason: string | null;
  };
  modules: RuntimeModuleStatus[];
  moduleOverrides: RuntimeModuleOverride[];
  receipt?: {
    action: string;
    module?: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
    reason: string | null;
  };
}

interface RuntimeAuditEntry {
  id: string;
  action: string;
  module: string | null;
  actor: string | null;
  reason: string | null;
  requestId: string | null;
  source: string | null;
  occurredAt: string;
  details: Record<string, unknown> | null;
}

const reasonLabelMap: Record<string, string> = {
  enabled: '已开启',
  runtime_disabled: '全局运行时关闭',
  kill_switch_active: 'Kill switch 生效',
  module_env_disabled: '模块环境开关关闭',
  module_override_disabled: '模块策略开关关闭',
};

const statusColor = (enabled: boolean) => (enabled ? 'success' : 'default');
const moduleLabelMap: Record<string, string> = {
  journey: 'Journey',
  council: 'Council',
  memory: 'Memory',
  creator: 'Creator',
  partner: 'Partner',
  relationshipGraph: 'Relationship Graph',
};

const auditActionLabelMap: Record<string, string> = {
  kill_switch_enabled: '开启全局 Kill Switch',
  kill_switch_disabled: '关闭全局 Kill Switch',
  module_enabled: '启用模块',
  module_disabled: '禁用模块',
};

const V3Ops: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [moduleMutating, setModuleMutating] = useState<string | null>(null);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<RuntimeAuditEntry[]>([]);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const payload = (await api.get('/api/admin/v3/runtime/status')) as RuntimeStatus;
      setStatus(payload);
      setLoadError(null);
    } catch (error) {
      const nextError = getApiErrorMessage(error, '加载 V3 运行时状态失败');
      setLoadError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const payload = (await api.get('/api/admin/v3/runtime/audit?limit=20')) as {
        items: RuntimeAuditEntry[];
      };
      setAuditItems(payload.items || []);
      setAuditError(null);
    } catch (error) {
      const nextError = getApiErrorMessage(error, '加载 V3 Runtime 审计失败');
      setAuditError(nextError);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAudit();
  }, [fetchStatus, fetchAudit]);

  const handleToggleKillSwitch = async (nextActive: boolean) => {
    try {
      setMutating(true);
      const payload = (await api.post('/api/admin/v3/runtime/kill-switch', {
        active: nextActive,
        reason: nextActive ? 'admin-v3-ops-enable-kill-switch' : 'admin-v3-ops-disable-kill-switch',
      })) as RuntimeStatus;
      setStatus(payload);
      await fetchAudit();
      setLoadError(null);
      message.success(nextActive ? 'V3 kill switch 已开启' : 'V3 kill switch 已关闭');
    } catch (error) {
      const nextError = getApiErrorMessage(error, '更新 V3 kill switch 失败');
      setLoadError(nextError);
      message.error(nextError);
    } finally {
      setMutating(false);
    }
  };

  const handleToggleModule = async (module: string, nextActive: boolean) => {
    try {
      setModuleMutating(module);
      const payload = (await api.post(`/api/admin/v3/runtime/modules/${module}/toggle`, {
        active: nextActive,
        reason: nextActive
          ? `admin-v3-ops-enable-module-${module}`
          : `admin-v3-ops-disable-module-${module}`,
      })) as RuntimeStatus;
      setStatus(payload);
      await fetchAudit();
      setLoadError(null);
      message.success(nextActive ? `${module} 模块已启用` : `${module} 模块已禁用`);
    } catch (error) {
      const nextError = getApiErrorMessage(error, `更新 ${module} 模块状态失败`);
      setLoadError(nextError);
      message.error(nextError);
    } finally {
      setModuleMutating(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="V3 Runtime 加载失败"
          description={loadError}
        />
      ) : null}

      <Card
        title="V3 Runtime 总控"
        extra={(
          <Button
            icon={<ReloadOutlined />}
            loading={loading || auditLoading}
            onClick={async () => {
              await Promise.all([fetchStatus(), fetchAudit()]);
            }}
          >
            刷新
          </Button>
        )}
        loading={loading && !status}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          当前提供进程内 kill switch 与模块策略 override。重启 backend 后 override 会清空，但环境变量配置仍会继续生效。
        </Typography.Paragraph>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="V3 环境开关">
            <Tag color={statusColor(status?.enabled ?? false)}>
              {status?.enabled ? 'ENABLED' : 'DISABLED'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="V3 实际生效">
            <Tag color={statusColor(status?.effectiveEnabled ?? false)}>
              {status?.effectiveEnabled ? 'ACTIVE' : 'BLOCKED'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="环境 Kill Switch">
            <Tag color={statusColor(!(status?.env.killSwitchActive ?? false))}>
              {status?.env.killSwitchActive ? 'ON' : 'OFF'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Override Kill Switch">
            <Tag color={statusColor(!(status?.override.active ?? false))}>
              {status?.override.active ? 'ON' : 'OFF'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="最近操作人">
            {status?.override.updatedBy || 'system'}
          </Descriptions.Item>
          <Descriptions.Item label="最近操作时间">
            {status?.override.updatedAt ? new Date(status.override.updatedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="最近原因" span={2}>
            {status?.override.reason || '-'}
          </Descriptions.Item>
        </Descriptions>

        <Space align="center" style={{ marginTop: 16 }}>
          <Switch
            checked={status?.override.active ?? false}
            loading={mutating}
            checkedChildren="Kill Switch ON"
            unCheckedChildren="Kill Switch OFF"
            onChange={handleToggleKillSwitch}
          />
          <Button
            danger
            icon={<PoweroffOutlined />}
            loading={mutating}
            onClick={() => handleToggleKillSwitch(!(status?.override.active ?? false))}
          >
            {status?.override.active ? '关闭 Kill Switch' : '开启 Kill Switch'}
          </Button>
        </Space>
      </Card>

      <Card title="模块状态" loading={loading && !status}>
        <List
          dataSource={status?.modules || []}
          renderItem={(item) => (
            <List.Item>
              <Space size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size={12}>
                  <Typography.Text strong>{moduleLabelMap[item.module] || item.module}</Typography.Text>
                  <Tag color={statusColor(item.effectiveEnabled)}>
                    {item.effectiveEnabled ? 'ACTIVE' : 'BLOCKED'}
                  </Tag>
                  <Tag color={item.envEnabled ? 'blue' : 'default'}>
                    env {item.envEnabled ? 'on' : 'off'}
                  </Tag>
                  <Tag color={item.overrideEnabled ? 'green' : 'orange'}>
                    policy {item.overrideEnabled ? 'on' : 'off'}
                  </Tag>
                </Space>
                <Space size={12}>
                  <Typography.Text type="secondary">
                    {reasonLabelMap[item.reason] || item.reason}
                  </Typography.Text>
                  <Switch
                    checked={item.overrideEnabled}
                    loading={moduleMutating === item.module}
                    disabled={Boolean(moduleMutating) || mutating}
                    checkedChildren="模块开"
                    unCheckedChildren="模块关"
                    onChange={(checked) => handleToggleModule(item.module, checked)}
                  />
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {auditError ? (
        <Alert
          type="error"
          showIcon
          message="V3 Runtime 审计加载失败"
          description={auditError}
        />
      ) : null}

      <Card title="审计日志" loading={auditLoading}>
        <List
          dataSource={auditItems}
          locale={{ emptyText: '暂无审计记录' }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={8} wrap>
                  <Tag color="blue">{auditActionLabelMap[item.action] || item.action}</Tag>
                  {item.module ? <Tag>{moduleLabelMap[item.module] || item.module}</Tag> : null}
                  <Typography.Text type="secondary">
                    {new Date(item.occurredAt).toLocaleString()}
                  </Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  actor: {item.actor || 'system'} | requestId: {item.requestId || '-'}
                </Typography.Text>
                {item.reason ? (
                  <Typography.Text type="secondary">reason: {item.reason}</Typography.Text>
                ) : null}
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
};

export default V3Ops;
