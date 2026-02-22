import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, message, Popconfirm, Select, Modal, Descriptions, Spin } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface TravelRecord {
  id: number;
  frogId: number;
  frogName: string;
  targetChain: string;
  targetWallet: string;
  status: string;
  isCrossChain: boolean;
  startTime: string;
  endTime: string;
  duration: number;
}

interface TravelDetail extends TravelRecord {
  currentStage: string;
  progress: number;
  crossChainStatus?: string;
  startTxHash?: string;
  completeTxHash?: string;
  journalContent?: string;
  observedTxCount?: number;
  observedTotalValue?: string;
  discoveries?: { type: string; title: string; description: string; rarity: number }[];
}

const statusColors: Record<string, string> = {
  Active: 'processing',
  Processing: 'warning',
  Completed: 'success',
  Cancelled: 'default',
  Failed: 'error',
};

const stageLabels: Record<string, string> = {
  DEPARTING: '出发中',
  CROSSING: '跨链穿越中',
  ARRIVING: '到达中',
  EXPLORING: '探索中',
  RETURNING: '返程中',
  INTERACTING: '社交互动中',
  STRANDED: '迷路/滞留',
};

const Travels: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [travels, setTravels] = useState<TravelRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<TravelDetail | null>(null);

  useEffect(() => {
    fetchTravels();
  }, [statusFilter]);

  const fetchTravels = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/travels', {
        params: { status: statusFilter || undefined },
      });
      setTravels((response as { data: TravelRecord[] }).data);
    } catch (err) {
      // 模拟数据
      setTravels([
        { id: 1, frogId: 1, frogName: 'Frog #1', targetChain: 'BSC_TESTNET', targetWallet: '0x1234...5678', status: 'Active', isCrossChain: true, startTime: '2026-01-15 10:00', endTime: '2026-01-15 11:00', duration: 3600 },
        { id: 2, frogId: 2, frogName: 'Frog #2', targetChain: 'ZETACHAIN_ATHENS', targetWallet: '0xabcd...ef01', status: 'Completed', isCrossChain: false, startTime: '2026-01-14 09:00', endTime: '2026-01-14 10:00', duration: 3600 },
        { id: 3, frogId: 3, frogName: 'Frog #3', targetChain: 'ETH_SEPOLIA', targetWallet: '0x9876...5432', status: 'Active', isCrossChain: true, startTime: '2026-01-15 09:30', endTime: '2026-01-15 10:30', duration: 3600 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (record: TravelRecord) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const response = await api.get(`/api/admin/travels/${record.id}`);
      setSelectedTravel(response as unknown as TravelDetail);
    } catch (err) {
      // 使用模拟数据
      setSelectedTravel({
        ...record,
        targetWallet: '0x' + '1234'.repeat(10),
        currentStage: 'EXPLORING',
        progress: 65,
        crossChainStatus: record.isCrossChain ? 'ON_TARGET_CHAIN' : undefined,
        startTxHash: '0x' + 'abc123'.repeat(6),
        journalContent: '今天我来到了一个神奇的钱包地址，发现这里有很多有趣的交易记录...',
        observedTxCount: 42,
        observedTotalValue: '1.5 ETH',
        discoveries: [
          { type: 'balance', title: '发现大户', description: '这个地址持有超过 100 ETH', rarity: 3 },
          { type: 'activity', title: 'DeFi 达人', description: '最近参与了 Uniswap 交易', rarity: 2 },
        ],
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleForceComplete = async (id: number) => {
    try {
      await api.put(`/api/admin/travels/${id}/force-complete`);
      message.success('强制完成成功');
      fetchTravels();
    } catch (err) {
      message.warning('后端 API 未实现');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '青蛙', dataIndex: 'frogName', key: 'frogName' },
    {
      title: '目标链',
      dataIndex: 'targetChain',
      key: 'targetChain',
      render: (chain: string) => <Tag color="blue">{chain}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '跨链',
      dataIndex: 'isCrossChain',
      key: 'isCrossChain',
      render: (isCross: boolean) => (isCross ? <Tag color="purple">跨链</Tag> : <Tag>本地</Tag>),
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TravelRecord) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {(record.status === 'Active' || record.status === 'Processing') && (
            <Popconfirm
              title="确定强制完成此旅行？这将重置青蛙为 Idle 状态。"
              onConfirm={() => handleForceComplete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" icon={<CheckCircleOutlined />}>
                强制完成
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="🚀 旅行记录管理"
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              placeholder="筛选状态"
              allowClear
              options={[
                { value: 'Active', label: '进行中' },
                { value: 'Completed', label: '已完成' },
                { value: 'Failed', label: '失败' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchTravels} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={travels}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 旅行详情弹窗 */}
      <Modal
        title={`旅行详情 #${selectedTravel?.id || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : selectedTravel ? (
          <div>
            {/* 基本信息 */}
            <Descriptions title="基本信息" column={2} size="small" bordered>
              <Descriptions.Item label="青蛙">{selectedTravel.frogName}</Descriptions.Item>
              <Descriptions.Item label="目标链">
                <Tag color="blue">{selectedTravel.targetChain}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="目标地址" span={2}>
                <span className="address" style={{ fontSize: 12 }}>{selectedTravel.targetWallet}</span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selectedTravel.status] || 'default'}>{selectedTravel.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                {stageLabels[selectedTravel.currentStage] || selectedTravel.currentStage}
              </Descriptions.Item>
              <Descriptions.Item label="进度">{selectedTravel.progress}%</Descriptions.Item>
              <Descriptions.Item label="跨链类型">
                {selectedTravel.isCrossChain ? <Tag color="purple">跨链旅行</Tag> : <Tag>本地旅行</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedTravel.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedTravel.endTime}</Descriptions.Item>
            </Descriptions>

            {/* 跨链状态 */}
            {selectedTravel.isCrossChain && selectedTravel.crossChainStatus && (
              <Descriptions title="跨链状态" column={2} size="small" bordered style={{ marginTop: 16 }}>
                <Descriptions.Item label="跨链状态">{selectedTravel.crossChainStatus}</Descriptions.Item>
                <Descriptions.Item label="开始交易">
                  {selectedTravel.startTxHash ? (
                    <span className="address" style={{ fontSize: 11 }}>
                      {selectedTravel.startTxHash.slice(0, 20)}...
                    </span>
                  ) : '-'}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* 观察结果 */}
            {(selectedTravel.observedTxCount || selectedTravel.observedTotalValue) && (
              <Descriptions title="观察结果" column={2} size="small" bordered style={{ marginTop: 16 }}>
                <Descriptions.Item label="交易数量">{selectedTravel.observedTxCount || 0}</Descriptions.Item>
                <Descriptions.Item label="总价值">{selectedTravel.observedTotalValue || '-'}</Descriptions.Item>
              </Descriptions>
            )}

            {/* 旅行日记 */}
            {selectedTravel.journalContent && (
              <Card title="📖 旅行日记" size="small" style={{ marginTop: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap', color: '#ccc' }}>{selectedTravel.journalContent}</p>
              </Card>
            )}

            {/* 发现列表 */}
            {selectedTravel.discoveries && selectedTravel.discoveries.length > 0 && (
              <Card title="🔍 旅行发现" size="small" style={{ marginTop: 16 }}>
                {selectedTravel.discoveries.map((discovery, index) => (
                  <div key={index} style={{ marginBottom: 8, padding: 8, background: '#2a2a2a', borderRadius: 4 }}>
                    <div>
                      <strong>{discovery.title}</strong>
                      <span style={{ marginLeft: 8 }}>{'⭐'.repeat(discovery.rarity)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{discovery.description}</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default Travels;
