import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  List,
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

type CreatorPackStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type CreatorReviewDecision = 'APPROVE' | 'REJECT';

interface CreatorPackRecord {
  id: string;
  creatorAppId: string;
  slug: string;
  title: string;
  summary: string | null;
  status: CreatorPackStatus;
  previewState: 'READY' | 'NEEDS_REVIEW';
  assetIds: string[];
  assetCount: number;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByActor: string;
    createdByKeyId: string;
    requestId: string | null;
  };
}

interface CreatorReviewQueueResponse {
  total: number;
  items: CreatorPackRecord[];
}

interface CreatorPreviewResponse {
  pack: CreatorPackRecord;
  render: {
    mode: 'SAFE';
    ready: boolean;
    warnings: string[];
    snapshot: {
      visualAssetCount: number;
      scriptAssetCount: number;
      totalBytes: number;
      mimeTypes: string[];
      previewImageUrl: string | null;
    };
  };
  assets: Array<{
    id: string;
    type: 'IMAGE' | 'AUDIO' | 'MODEL' | 'TEXTURE' | 'SCRIPT';
    mimeType: string;
    bytes: number;
    status: 'READY' | 'REJECTED';
    sourceUrl: string;
  }>;
  generatedAt: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: CreatorPackStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'IN_REVIEW' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已归档', value: 'ARCHIVED' },
];

const statusColorMap: Record<CreatorPackStatus, string> = {
  DRAFT: 'default',
  IN_REVIEW: 'processing',
  PUBLISHED: 'success',
  REJECTED: 'error',
  ARCHIVED: 'purple',
};

const statusLabelMap: Record<CreatorPackStatus, string> = {
  DRAFT: '草稿',
  IN_REVIEW: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '已驳回',
  ARCHIVED: '已归档',
};

const bytesToText = (value: number): string => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
};

const CreatorsPage: React.FC = () => {
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queue, setQueue] = useState<CreatorPackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CreatorPackStatus>('IN_REVIEW');
  const [appIdFilter, setAppIdFilter] = useState('');

  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CreatorPreviewResponse | null>(null);

  const [actionLoadingPackId, setActionLoadingPackId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');

  const fetchQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const query = new URLSearchParams();
      query.set('status', statusFilter);
      query.set('limit', '30');
      if (appIdFilter.trim()) {
        query.set('appId', appIdFilter.trim());
      }

      const payload = (await api.get(
        `/api/admin/v3/creators/review-queue?${query.toString()}`
      )) as CreatorReviewQueueResponse;

      setQueue(payload.items || []);
      setTotal(payload.total || 0);
      setQueueError(null);

      if (selectedPackId && !(payload.items || []).some((item) => item.id === selectedPackId)) {
        setSelectedPackId(null);
        setPreview(null);
      }
    } catch (error) {
      setQueue([]);
      setTotal(0);
      setQueueError(getApiErrorMessage(error, '加载 Creator 审核队列失败'));
    } finally {
      setLoadingQueue(false);
    }
  }, [appIdFilter, selectedPackId, statusFilter]);

  const fetchPreview = useCallback(async (packId: string) => {
    try {
      setPreviewLoading(true);
      const payload = (await api.get(
        `/api/admin/v3/creators/packs/${encodeURIComponent(packId)}/preview`
      )) as CreatorPreviewResponse;
      setPreview(payload);
      setPreviewError(null);
    } catch (error) {
      setPreview(null);
      setPreviewError(getApiErrorMessage(error, '加载 preview 失败'));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const runReviewAction = useCallback(
    async (packId: string, decision: CreatorReviewDecision) => {
      try {
        setActionLoadingPackId(packId);
        await api.post(`/api/admin/v3/creators/packs/${encodeURIComponent(packId)}/review`, {
          decision,
          ...(actionNote.trim() ? { note: actionNote.trim() } : {}),
        });
        message.success(decision === 'APPROVE' ? '已通过审核并发布' : '已驳回该 Pack');
        await fetchQueue();
        if (selectedPackId === packId) {
          await fetchPreview(packId);
        }
      } catch (error) {
        message.error(getApiErrorMessage(error, '审核操作失败'));
      } finally {
        setActionLoadingPackId(null);
      }
    },
    [actionNote, fetchPreview, fetchQueue, selectedPackId]
  );

  const runRollbackAction = useCallback(
    async (packId: string) => {
      try {
        setActionLoadingPackId(packId);
        await api.post(`/api/admin/v3/creators/packs/${encodeURIComponent(packId)}/rollback`, {
          ...(actionNote.trim() ? { reason: actionNote.trim() } : {}),
        });
        message.success('已回滚到草稿态');
        await fetchQueue();
        if (selectedPackId === packId) {
          await fetchPreview(packId);
        }
      } catch (error) {
        message.error(getApiErrorMessage(error, '回滚操作失败'));
      } finally {
        setActionLoadingPackId(null);
      }
    },
    [actionNote, fetchPreview, fetchQueue, selectedPackId]
  );

  const columns: ColumnsType<CreatorPackRecord> = useMemo(
    () => [
      {
        title: 'Pack',
        key: 'pack',
        width: 280,
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
        title: 'Creator App',
        dataIndex: 'creatorAppId',
        key: 'creatorAppId',
        width: 180,
        render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: CreatorPackStatus) => (
          <Tag color={statusColorMap[value]}>{statusLabelMap[value]}</Tag>
        ),
      },
      {
        title: '资产',
        dataIndex: 'assetCount',
        key: 'assetCount',
        width: 90,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 170,
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        render: (_, item) => (
          <Space wrap>
            <Button
              size="small"
              onClick={() => {
                setSelectedPackId(item.id);
                void fetchPreview(item.id);
              }}
            >
              Preview
            </Button>
            {item.status === 'IN_REVIEW' ? (
              <>
                <Button
                  size="small"
                  type="primary"
                  loading={actionLoadingPackId === item.id}
                  onClick={() => void runReviewAction(item.id, 'APPROVE')}
                >
                  通过
                </Button>
                <Button
                  size="small"
                  danger
                  loading={actionLoadingPackId === item.id}
                  onClick={() => void runReviewAction(item.id, 'REJECT')}
                >
                  驳回
                </Button>
              </>
            ) : null}
            {item.status === 'PUBLISHED' ? (
              <Button
                size="small"
                danger
                loading={actionLoadingPackId === item.id}
                onClick={() => void runRollbackAction(item.id)}
              >
                回滚
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [actionLoadingPackId, fetchPreview, runReviewAction, runRollbackAction]
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {queueError ? (
        <Alert type="error" showIcon message="Creator 审核队列加载失败" description={queueError} />
      ) : null}

      <Card
        title="Creator 审核队列"
        extra={(
          <Button icon={<ReloadOutlined />} loading={loadingQueue} onClick={fetchQueue}>
            刷新
          </Button>
        )}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            style={{ width: 160 }}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
          />
          <Input
            placeholder="creator appId"
            style={{ width: 220 }}
            value={appIdFilter}
            onChange={(event) => setAppIdFilter(event.target.value)}
            onPressEnter={() => void fetchQueue()}
          />
          <Input
            placeholder="审核备注/回滚原因（可选）"
            style={{ width: 300 }}
            value={actionNote}
            onChange={(event) => setActionNote(event.target.value)}
            maxLength={280}
          />
          <Button onClick={() => void fetchQueue()}>查询</Button>
        </Space>

        <Table
          rowKey="id"
          size="small"
          loading={loadingQueue}
          columns={columns}
          dataSource={queue}
          pagination={false}
          scroll={{ x: 1120 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedPackId(record.id);
              void fetchPreview(record.id);
            },
          })}
        />
        <Typography.Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          共 {total} 条（默认按更新时间降序）
        </Typography.Text>
      </Card>

      <Card
        title="Preview Renderer"
        extra={selectedPackId ? (
          <Button
            icon={<ReloadOutlined />}
            loading={previewLoading}
            onClick={() => (selectedPackId ? void fetchPreview(selectedPackId) : undefined)}
          >
            刷新预览
          </Button>
        ) : null}
      >
        {previewError ? (
          <Alert type="error" showIcon message="Preview 加载失败" description={previewError} style={{ marginBottom: 12 }} />
        ) : null}

        {!selectedPackId ? (
          <Typography.Text type="secondary">从上方队列中选择一个 Pack 查看渲染快照。</Typography.Text>
        ) : null}

        {preview ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Typography.Text strong>{preview.pack.title}</Typography.Text>
              <Tag color={statusColorMap[preview.pack.status]}>{statusLabelMap[preview.pack.status]}</Tag>
              <Tag color={preview.render.ready ? 'success' : 'warning'}>
                {preview.render.ready ? 'READY' : 'NEEDS_FIX'}
              </Tag>
              <Typography.Text code>{preview.pack.id}</Typography.Text>
            </Space>

            <Space wrap>
              <Tag>视觉资产 {preview.render.snapshot.visualAssetCount}</Tag>
              <Tag>脚本资产 {preview.render.snapshot.scriptAssetCount}</Tag>
              <Tag>总大小 {bytesToText(preview.render.snapshot.totalBytes)}</Tag>
            </Space>

            {preview.render.warnings.length ? (
              <List
                size="small"
                header={<Typography.Text>渲染警告</Typography.Text>}
                dataSource={preview.render.warnings}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            ) : null}

            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={preview.assets}
              columns={[
                {
                  title: 'Asset',
                  key: 'asset',
                  render: (_, row) => (
                    <Space direction="vertical" size={0}>
                      <Typography.Text code>{row.id}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {row.type} / {row.mimeType}
                      </Typography.Text>
                    </Space>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 110,
                  render: (value: 'READY' | 'REJECTED') => (
                    <Tag color={value === 'READY' ? 'success' : 'error'}>{value}</Tag>
                  ),
                },
                {
                  title: '大小',
                  dataIndex: 'bytes',
                  key: 'bytes',
                  width: 120,
                  render: (value: number) => bytesToText(value),
                },
                {
                  title: 'Source URL',
                  dataIndex: 'sourceUrl',
                  key: 'sourceUrl',
                  render: (value: string) => (
                    <Typography.Link href={value} target="_blank" rel="noreferrer">
                      {value}
                    </Typography.Link>
                  ),
                },
              ]}
            />
          </Space>
        ) : null}
      </Card>
    </Space>
  );
};

export default CreatorsPage;
