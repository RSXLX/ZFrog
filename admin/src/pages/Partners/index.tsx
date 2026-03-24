import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

type PartnerCampaignStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';

interface PartnerCampaignRecord {
  id: string;
  partnerAppId: string;
  slug: string;
  title: string;
  description: string | null;
  status: PartnerCampaignStatus;
  callbackEndpoint: string;
  createdAt: string;
  updatedAt: string;
}

interface PartnerCallbackRecord {
  id: string;
  campaignId: string;
  partnerEventId: string;
  eventType: 'REWARD_GRANTED' | 'CAMPAIGN_STATUS_SYNC';
  verified: boolean;
  status: 'ACCEPTED' | 'REJECTED';
  reason: string | null;
  rewardId: string | null;
  receivedAt: string;
}

interface PartnerRewardRecord {
  id: string;
  campaignId: string;
  callbackId: string;
  recipientWallet: string;
  rewardType: string;
  amount: string;
  status: 'GRANTED' | 'REVOKED';
  grantedAt: string;
}

interface PartnerCampaignListResponse {
  total: number;
  items: PartnerCampaignRecord[];
}

interface PartnerCallbackListResponse {
  total: number;
  items: PartnerCallbackRecord[];
}

interface PartnerRewardListResponse {
  total: number;
  items: PartnerRewardRecord[];
}

const STATUS_OPTIONS: Array<{ label: string; value: PartnerCampaignStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已暂停', value: 'PAUSED' },
  { label: '已归档', value: 'ARCHIVED' },
];

const statusColorMap: Record<PartnerCampaignStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'purple',
};

const statusLabelMap: Record<PartnerCampaignStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  PAUSED: '已暂停',
  ARCHIVED: '已归档',
};

const PartnersPage: React.FC = () => {
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<PartnerCampaignRecord[]>([]);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<PartnerCampaignStatus | undefined>(undefined);
  const [appIdFilter, setAppIdFilter] = useState('');

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loadingCallbacks, setLoadingCallbacks] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [callbacksError, setCallbacksError] = useState<string | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [callbacks, setCallbacks] = useState<PartnerCallbackRecord[]>([]);
  const [rewards, setRewards] = useState<PartnerRewardRecord[]>([]);

  const [actionLoadingCampaignId, setActionLoadingCampaignId] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const query = new URLSearchParams();
      query.set('limit', '50');
      if (statusFilter) {
        query.set('status', statusFilter);
      }
      if (appIdFilter.trim()) {
        query.set('appId', appIdFilter.trim());
      }

      const payload = (await api.get(
        `/api/admin/v3/partners/campaigns?${query.toString()}`
      )) as PartnerCampaignListResponse;

      const nextItems = payload.items || [];
      setCampaigns(nextItems);
      setTotal(payload.total || 0);
      setCampaignsError(null);

      if (selectedCampaignId && !nextItems.some((item) => item.id === selectedCampaignId)) {
        setSelectedCampaignId(null);
        setCallbacks([]);
        setRewards([]);
      }
    } catch (error) {
      setCampaigns([]);
      setTotal(0);
      setCampaignsError(getApiErrorMessage(error, '加载 Partner Campaign 列表失败'));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [appIdFilter, selectedCampaignId, statusFilter]);

  const fetchAudit = useCallback(async (campaignId: string) => {
    try {
      setLoadingCallbacks(true);
      setLoadingRewards(true);

      const [callbacksPayload, rewardsPayload] = await Promise.all([
        api.get(`/api/admin/v3/partners/campaigns/${encodeURIComponent(campaignId)}/callbacks?limit=30`) as Promise<PartnerCallbackListResponse>,
        api.get(`/api/admin/v3/partners/campaigns/${encodeURIComponent(campaignId)}/rewards?limit=30`) as Promise<PartnerRewardListResponse>,
      ]);

      setCallbacks(callbacksPayload.items || []);
      setRewards(rewardsPayload.items || []);
      setCallbacksError(null);
      setRewardsError(null);
    } catch (error) {
      setCallbacks([]);
      setRewards([]);
      const msg = getApiErrorMessage(error, '加载 Partner 审计数据失败');
      setCallbacksError(msg);
      setRewardsError(msg);
    } finally {
      setLoadingCallbacks(false);
      setLoadingRewards(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const runAction = useCallback(
    async (campaign: PartnerCampaignRecord, action: 'publish' | 'pause' | 'resume' | 'rollback') => {
      try {
        setActionLoadingCampaignId(campaign.id);

        if (action === 'rollback') {
          await api.post(`/api/admin/v3/partners/campaigns/${encodeURIComponent(campaign.id)}/rollback`, {
            ...(rollbackReason.trim() ? { reason: rollbackReason.trim() } : {}),
          });
        } else {
          await api.post(
            `/api/admin/v3/partners/campaigns/${encodeURIComponent(campaign.id)}/${action}`
          );
        }

        const actionLabelMap: Record<typeof action, string> = {
          publish: '已发布 Campaign',
          pause: '已暂停 Campaign',
          resume: '已恢复 Campaign',
          rollback: '已一键回滚为暂停',
        };
        message.success(actionLabelMap[action]);

        await fetchCampaigns();
        if (selectedCampaignId === campaign.id) {
          await fetchAudit(campaign.id);
        }
      } catch (error) {
        message.error(getApiErrorMessage(error, 'Campaign 操作失败'));
      } finally {
        setActionLoadingCampaignId(null);
      }
    },
    [fetchAudit, fetchCampaigns, rollbackReason, selectedCampaignId]
  );

  const campaignColumns: ColumnsType<PartnerCampaignRecord> = useMemo(
    () => [
      {
        title: 'Campaign',
        key: 'campaign',
        width: 300,
        render: (_, item) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{item.title}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {item.id} / {item.slug}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Partner App',
        dataIndex: 'partnerAppId',
        key: 'partnerAppId',
        width: 180,
        render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: PartnerCampaignStatus) => (
          <Tag color={statusColorMap[value]}>{statusLabelMap[value]}</Tag>
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 320,
        render: (_, item) => (
          <Space wrap>
            <Button
              size="small"
              onClick={() => {
                setSelectedCampaignId(item.id);
                void fetchAudit(item.id);
              }}
            >
              审计
            </Button>
            {item.status === 'DRAFT' ? (
              <Button
                size="small"
                type="primary"
                loading={actionLoadingCampaignId === item.id}
                onClick={() => void runAction(item, 'publish')}
              >
                发布
              </Button>
            ) : null}
            {item.status === 'PUBLISHED' ? (
              <>
                <Button
                  size="small"
                  loading={actionLoadingCampaignId === item.id}
                  onClick={() => void runAction(item, 'pause')}
                >
                  暂停
                </Button>
                <Button
                  size="small"
                  danger
                  loading={actionLoadingCampaignId === item.id}
                  onClick={() => void runAction(item, 'rollback')}
                >
                  一键回滚
                </Button>
              </>
            ) : null}
            {item.status === 'PAUSED' ? (
              <Button
                size="small"
                type="primary"
                loading={actionLoadingCampaignId === item.id}
                onClick={() => void runAction(item, 'resume')}
              >
                恢复
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [actionLoadingCampaignId, fetchAudit, runAction]
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {campaignsError ? (
        <Alert type="error" showIcon message="Partner Campaign 列表加载失败" description={campaignsError} />
      ) : null}

      <Card
        title="Partner Campaign Runtime"
        extra={(
          <Button icon={<ReloadOutlined />} loading={loadingCampaigns} onClick={fetchCampaigns}>
            刷新
          </Button>
        )}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 160 }}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
          />
          <Input
            placeholder="partner appId"
            style={{ width: 220 }}
            value={appIdFilter}
            onChange={(event) => setAppIdFilter(event.target.value)}
            onPressEnter={() => void fetchCampaigns()}
          />
          <Input
            placeholder="回滚原因（可选）"
            style={{ width: 280 }}
            value={rollbackReason}
            onChange={(event) => setRollbackReason(event.target.value)}
            maxLength={240}
          />
          <Button onClick={() => void fetchCampaigns()}>查询</Button>
        </Space>

        <Table
          rowKey="id"
          size="small"
          loading={loadingCampaigns}
          columns={campaignColumns}
          dataSource={campaigns}
          pagination={false}
          scroll={{ x: 1120 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedCampaignId(record.id);
              void fetchAudit(record.id);
            },
          })}
        />
        <Typography.Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          共 {total} 条（默认按更新时间降序）
        </Typography.Text>
      </Card>

      <Card
        title="Callback 审计"
        extra={selectedCampaignId ? (
          <Button
            icon={<ReloadOutlined />}
            loading={loadingCallbacks || loadingRewards}
            onClick={() => (selectedCampaignId ? void fetchAudit(selectedCampaignId) : undefined)}
          >
            刷新审计
          </Button>
        ) : null}
      >
        {callbacksError ? (
          <Alert type="error" showIcon message="Callback 审计加载失败" description={callbacksError} style={{ marginBottom: 12 }} />
        ) : null}

        {!selectedCampaignId ? (
          <Typography.Text type="secondary">从上方选择一个 Campaign 查看回调与奖励轨迹。</Typography.Text>
        ) : (
          <Table
            rowKey="id"
            size="small"
            loading={loadingCallbacks}
            dataSource={callbacks}
            pagination={false}
            columns={[
              {
                title: 'Callback',
                key: 'callback',
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text code>{row.id}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {row.partnerEventId} / {row.eventType}
                    </Typography.Text>
                  </Space>
                ),
              },
              {
                title: '验签',
                key: 'verified',
                width: 110,
                render: (_, row) => (
                  <Tag color={row.verified ? 'success' : 'error'}>{row.verified ? 'VERIFIED' : 'REJECTED'}</Tag>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (value: 'ACCEPTED' | 'REJECTED') => (
                  <Tag color={value === 'ACCEPTED' ? 'success' : 'error'}>{value}</Tag>
                ),
              },
              {
                title: '奖励 ID',
                dataIndex: 'rewardId',
                key: 'rewardId',
                width: 190,
                render: (value: string | null) => (value ? <Typography.Text code>{value}</Typography.Text> : '-'),
              },
              {
                title: '接收时间',
                dataIndex: 'receivedAt',
                key: 'receivedAt',
                width: 180,
                render: (value: string) => new Date(value).toLocaleString(),
              },
            ]}
          />
        )}
      </Card>

      <Card title="Reward 轨迹">
        {rewardsError ? (
          <Alert type="error" showIcon message="Reward 轨迹加载失败" description={rewardsError} style={{ marginBottom: 12 }} />
        ) : null}

        <Table
          rowKey="id"
          size="small"
          loading={loadingRewards}
          dataSource={rewards}
          pagination={false}
          columns={[
            {
              title: 'Reward',
              key: 'reward',
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text code>{row.id}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {row.rewardType} / {row.amount}
                  </Typography.Text>
                </Space>
              ),
            },
            {
              title: 'Recipient',
              dataIndex: 'recipientWallet',
              key: 'recipientWallet',
              render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              width: 120,
              render: (value: 'GRANTED' | 'REVOKED') => (
                <Tag color={value === 'GRANTED' ? 'success' : 'error'}>{value}</Tag>
              ),
            },
            {
              title: 'Granted At',
              dataIndex: 'grantedAt',
              key: 'grantedAt',
              width: 180,
              render: (value: string) => new Date(value).toLocaleString(),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default PartnersPage;
