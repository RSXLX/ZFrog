import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface RitualRecord {
  id: string;
  frogId: number;
  targetFrogId: number | null;
  ritualType: string;
  status: string;
  payload: unknown;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  frog: {
    id: number;
    tokenId: number;
    name: string;
  };
  targetFrog: {
    id: number;
    tokenId: number;
    name: string;
  } | null;
}

interface PagedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const statusColorMap: Record<string, string> = {
  PENDING: 'warning',
  RUNNING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

const Rituals: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<RitualRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [ritualType, setRitualType] = useState('');
  const [status, setStatus] = useState('');
  const [frogId, setFrogId] = useState('');
  const [targetFrogId, setTargetFrogId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/rituals', {
        params: {
          page,
          pageSize,
          type: ritualType || undefined,
          status: status || undefined,
          frogId: frogId || undefined,
          targetFrogId: targetFrogId || undefined,
        },
      });
      const result = response as unknown as PagedResponse<RitualRecord>;
      setRecords(result.data || []);
      setTotal(result.total || 0);
      setLoadError(null);
    } catch (err) {
      setRecords([]);
      setTotal(0);
      const msg = getApiErrorMessage(err, '加载 rituals 失败');
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, ritualType, status, frogId, targetFrogId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchData();
  };

  const columns: ColumnsType<RitualRecord> = [
    {
      title: 'Ritual ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="address">{`${value.slice(0, 8)}...${value.slice(-4)}`}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'ritualType',
      key: 'ritualType',
      width: 130,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string) => <Tag color={statusColorMap[value] || 'default'}>{value}</Tag>,
    },
    {
      title: '发起青蛙',
      dataIndex: 'frog',
      key: 'frog',
      width: 180,
      render: (frog: RitualRecord['frog']) => (
        <span>
          #{frog.tokenId} {frog.name}
        </span>
      ),
    },
    {
      title: '目标青蛙',
      dataIndex: 'targetFrog',
      key: 'targetFrog',
      width: 180,
      render: (frog: RitualRecord['targetFrog']) =>
        frog ? (
          <span>
            #{frog.tokenId} {frog.name}
          </span>
        ) : (
          <span style={{ color: '#888' }}>-</span>
        ),
    },
    {
      title: 'Payload',
      dataIndex: 'payload',
      key: 'payload',
      width: 240,
      render: (value: unknown) => {
        if (!value) return <span style={{ color: '#888' }}>-</span>;
        const text = JSON.stringify(value);
        const shortText = text.length > 64 ? `${text.slice(0, 64)}...` : text;
        return (
          <Tooltip title={text}>
            <span style={{ fontSize: 12, color: '#bbb' }}>{shortText}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 180,
      render: (value: string | null) => (value ? new Date(value).toLocaleString() : '-'),
    },
  ];

  return (
    <Card
      title="🕯️ Rituals"
      extra={
        <Space wrap>
          <Input
            style={{ width: 120 }}
            value={frogId}
            onChange={(event) => setFrogId(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="frogId"
          />
          <Input
            style={{ width: 140 }}
            value={targetFrogId}
            onChange={(event) => setTargetFrogId(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="targetFrogId"
          />
          <Input
            style={{ width: 140 }}
            value={ritualType}
            onChange={(event) => setRitualType(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="type"
          />
          <Select
            allowClear
            value={status || undefined}
            onChange={(value) => setStatus(value || '')}
            style={{ width: 130 }}
            options={[
              { value: 'PENDING', label: 'PENDING' },
              { value: 'RUNNING', label: 'RUNNING' },
              { value: 'COMPLETED', label: 'COMPLETED' },
              { value: 'FAILED', label: 'FAILED' },
              { value: 'CANCELLED', label: 'CANCELLED' },
            ]}
            placeholder="status"
          />
          <Button icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      {loadError && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message="加载失败"
          description={loadError}
        />
      )}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={records}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
        scroll={{ x: 1480 }}
        size="small"
      />
    </Card>
  );
};

export default Rituals;
