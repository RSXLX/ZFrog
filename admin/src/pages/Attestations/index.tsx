import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface FrogSummary {
  id: number;
  tokenId: number;
  name: string;
}

interface AttestationRecord {
  id: string;
  subjectFrogId: number;
  objectFrogId: number;
  subjectFrog: FrogSummary | null;
  objectFrog: FrogSummary | null;
  attestationType: string;
  source: string;
  status: string;
  createdByAddress: string;
  onchainTrace: {
    milestoneId: string;
    txHash: string | null;
    chainId: number | null;
    blockNumber: string | null;
    recordedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface PagedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const statusColorMap: Record<string, string> = {
  QUEUED: 'warning',
  CONFIRMED: 'success',
  FAILED: 'error',
};

const Attestations: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttestationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [subjectFrogId, setSubjectFrogId] = useState('');
  const [objectFrogId, setObjectFrogId] = useState('');
  const [attestationType, setAttestationType] = useState('');
  const [source, setSource] = useState('');
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<'ALL' | 'QUEUED' | 'CONFIRMED' | 'FAILED'>('ALL');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/attestations', {
        params: {
          page,
          pageSize,
          subjectFrogId: subjectFrogId || undefined,
          objectFrogId: objectFrogId || undefined,
          attestationType: attestationType || undefined,
          source: source || undefined,
          txHash: txHash || undefined,
          status: status === 'ALL' ? undefined : status,
        },
      });
      const result = response as unknown as PagedResponse<AttestationRecord>;
      setRecords(result.data || []);
      setTotal(result.total || 0);
      setLoadError(null);
    } catch (err) {
      setRecords([]);
      setTotal(0);
      const msg = getApiErrorMessage(err, '加载 attestations 失败');
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, subjectFrogId, objectFrogId, attestationType, source, txHash, status]);

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

  const columns: ColumnsType<AttestationRecord> = [
    {
      title: 'Attestation ID',
      dataIndex: 'id',
      key: 'id',
      width: 220,
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="address">{`${value.slice(0, 10)}...${value.slice(-6)}`}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'attestationType',
      key: 'attestationType',
      width: 120,
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
      title: 'Subject',
      dataIndex: 'subjectFrog',
      key: 'subjectFrog',
      width: 170,
      render: (frog: FrogSummary | null, record) =>
        frog ? (
          <span>
            #{frog.tokenId} {frog.name}
          </span>
        ) : (
          <span style={{ color: '#888' }}>frogId={record.subjectFrogId}</span>
        ),
    },
    {
      title: 'Object',
      dataIndex: 'objectFrog',
      key: 'objectFrog',
      width: 170,
      render: (frog: FrogSummary | null, record) =>
        frog ? (
          <span>
            #{frog.tokenId} {frog.name}
          </span>
        ) : (
          <span style={{ color: '#888' }}>frogId={record.objectFrogId}</span>
        ),
    },
    {
      title: 'Onchain Tx',
      dataIndex: 'onchainTrace',
      key: 'onchainTrace',
      width: 260,
      render: (trace: AttestationRecord['onchainTrace']) => {
        if (!trace?.txHash) {
          return <Tag>pending</Tag>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Tooltip title={trace.txHash}>
              <span className="address">{`${trace.txHash.slice(0, 10)}...${trace.txHash.slice(-8)}`}</span>
            </Tooltip>
            <span style={{ color: '#888', fontSize: 12 }}>
              chain={trace.chainId || '-'} block={trace.blockNumber || '-'}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 140,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Created By',
      dataIndex: 'createdByAddress',
      key: 'createdByAddress',
      width: 220,
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="address">{`${value.slice(0, 8)}...${value.slice(-6)}`}</span>
        </Tooltip>
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
      title="🧷 Relationship Attestations"
      extra={
        <Space wrap>
          <Input
            style={{ width: 120 }}
            value={subjectFrogId}
            onChange={(event) => setSubjectFrogId(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="subjectFrogId"
          />
          <Input
            style={{ width: 120 }}
            value={objectFrogId}
            onChange={(event) => setObjectFrogId(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="objectFrogId"
          />
          <Input
            style={{ width: 130 }}
            value={attestationType}
            onChange={(event) => setAttestationType(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="attestationType"
          />
          <Input
            style={{ width: 120 }}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="source"
          />
          <Input
            style={{ width: 200 }}
            value={txHash}
            onChange={(event) => setTxHash(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="txHash"
          />
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: 130 }}
            options={[
              { value: 'ALL', label: '全部状态' },
              { value: 'QUEUED', label: 'QUEUED' },
              { value: 'CONFIRMED', label: 'CONFIRMED' },
              { value: 'FAILED', label: 'FAILED' },
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
        scroll={{ x: 1800 }}
        size="small"
      />
    </Card>
  );
};

export default Attestations;
