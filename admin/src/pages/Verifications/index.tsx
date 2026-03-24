import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface VerificationRecord {
  id: string;
  walletAddress: string;
  action: string;
  provider: string;
  verified: boolean;
  nullifierHash: string | null;
  createdAt: string;
  frog: {
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

const Verifications: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [walletAddress, setWalletAddress] = useState('');
  const [action, setAction] = useState('');
  const [provider, setProvider] = useState('');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/verifications', {
        params: {
          page,
          pageSize,
          walletAddress: walletAddress || undefined,
          action: action || undefined,
          provider: provider || undefined,
          verified: verified === 'all' ? undefined : verified,
        },
      });
      const result = response as unknown as PagedResponse<VerificationRecord>;
      setRecords(result.data || []);
      setTotal(result.total || 0);
      setLoadError(null);
    } catch (err) {
      setRecords([]);
      setTotal(0);
      const msg = getApiErrorMessage(err, '加载 verifications 失败');
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, walletAddress, action, provider, verified]);

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

  const columns: ColumnsType<VerificationRecord> = [
    {
      title: 'Verification ID',
      dataIndex: 'id',
      key: 'id',
      width: 260,
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="address">{`${value.slice(0, 10)}...${value.slice(-6)}`}</span>
        </Tooltip>
      ),
    },
    {
      title: '钱包地址',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 220,
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="address">{`${value.slice(0, 8)}...${value.slice(-6)}`}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 130,
      render: (value: string) => <Tag>{value || 'unknown'}</Tag>,
    },
    {
      title: '验证状态',
      dataIndex: 'verified',
      key: 'verified',
      width: 120,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'error'}>{value ? '已验证' : '未验证'}</Tag>
      ),
    },
    {
      title: '关联青蛙',
      dataIndex: 'frog',
      key: 'frog',
      width: 170,
      render: (frog: VerificationRecord['frog']) =>
        frog ? (
          <span>
            #{frog.tokenId} {frog.name}
          </span>
        ) : (
          <span style={{ color: '#888' }}>-</span>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ];

  return (
    <Card
      title="🧍 Human Verifications"
      extra={
        <Space wrap>
          <Input
            style={{ width: 190 }}
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="钱包地址"
          />
          <Input
            style={{ width: 150 }}
            value={action}
            onChange={(event) => setAction(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="action"
          />
          <Input
            style={{ width: 140 }}
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="provider"
          />
          <Select
            value={verified}
            onChange={(value) => setVerified(value)}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'true', label: '已验证' },
              { value: 'false', label: '未验证' },
            ]}
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
        scroll={{ x: 1300 }}
        size="small"
      />
    </Card>
  );
};

export default Verifications;
