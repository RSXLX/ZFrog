import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface MemoryPalaceRecord {
  id: number;
  frogId: number;
  frog: {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
  } | null;
  recapText: string | null;
  recapPreview: string | null;
  timelineCount: number;
  highlightCount: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

interface PagedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const MemoryPalaces: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<MemoryPalaceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [frogId, setFrogId] = useState('');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/memory-palaces', {
        params: {
          page,
          pageSize,
          frogId: frogId || undefined,
          search: search || undefined,
        },
      });
      const result = response as unknown as PagedResponse<MemoryPalaceRecord>;
      setRecords(result.data || []);
      setTotal(result.total || 0);
      setLoadError(null);
    } catch (err) {
      setRecords([]);
      setTotal(0);
      const msg = getApiErrorMessage(err, '加载 memory-palaces 失败');
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, frogId, search]);

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

  const columns: ColumnsType<MemoryPalaceRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '青蛙',
      dataIndex: 'frog',
      key: 'frog',
      width: 220,
      render: (frog: MemoryPalaceRecord['frog']) =>
        frog ? (
          <div>
            <div>
              #{frog.tokenId} {frog.name}
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {frog.ownerAddress ? `${frog.ownerAddress.slice(0, 8)}...${frog.ownerAddress.slice(-6)}` : '-'}
            </div>
          </div>
        ) : (
          <span style={{ color: '#888' }}>-</span>
        ),
    },
    {
      title: 'Recap',
      dataIndex: 'recapPreview',
      key: 'recapPreview',
      width: 420,
      render: (value: string | null) => {
        if (!value) return <span style={{ color: '#888' }}>-</span>;
        const shortText = value.length > 120 ? `${value.slice(0, 120)}...` : value;
        return (
          <Tooltip title={value}>
            <span style={{ color: '#ccc' }}>{shortText}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Timeline',
      dataIndex: 'timelineCount',
      key: 'timelineCount',
      width: 110,
      render: (count: number) => <Tag color="geekblue">{count}</Tag>,
    },
    {
      title: 'Highlights',
      dataIndex: 'highlightCount',
      key: 'highlightCount',
      width: 110,
      render: (count: number) => <Tag color="purple">{count}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Metadata',
      dataIndex: 'metadata',
      key: 'metadata',
      width: 210,
      render: (value: unknown) => {
        if (!value) return <span style={{ color: '#888' }}>-</span>;
        const text = JSON.stringify(value);
        return (
          <Tooltip title={text}>
            <span style={{ color: '#aaa', fontSize: 12 }}>
              {text.length > 48 ? `${text.slice(0, 48)}...` : text}
            </span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Card
      title="🧠 Memory Palaces"
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
            style={{ width: 220 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="搜索 recap / frog"
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
        scroll={{ x: 1450 }}
        size="small"
      />
    </Card>
  );
};

export default MemoryPalaces;
