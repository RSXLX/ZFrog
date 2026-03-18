import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Button, Space, Modal, Select, message, Descriptions, Popconfirm } from 'antd';
import { SearchOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface FrogRecord {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  status: string;
  xp: number;
  level: number;
  totalTravels: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  Idle: 'success',
  Traveling: 'processing',
  Returning: 'warning',
  CrossChainLocked: 'error',
};

const Frogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recalling, setRecalling] = useState<number | null>(null);
  const [frogs, setFrogs] = useState<FrogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFrog, setSelectedFrog] = useState<FrogRecord | null>(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchFrogs();
  }, [page, pageSize]);

  const fetchFrogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/frogs', {
        params: { page, pageSize, search },
      });
      const data = response as unknown as { data: FrogRecord[]; total: number };
      setFrogs(data.data);
      setTotal(data.total);
    } catch (err) {
      setFrogs([]);
      setTotal(0);
      message.error(getApiErrorMessage(err, '加载青蛙列表失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchFrogs();
  };

  const handleStatusEdit = (record: FrogRecord) => {
    setSelectedFrog(record);
    setNewStatus(record.status);
    setEditModalVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedFrog || !newStatus) return;
    try {
      await api.put(`/api/admin/frogs/${selectedFrog.tokenId}/status`, { status: newStatus });
      message.success('状态更新成功');
      setEditModalVisible(false);
      fetchFrogs();
    } catch (err) {
      message.error(getApiErrorMessage(err, '状态更新失败'));
      setEditModalVisible(false);
    }
  };

  // 链上召回青蛙
  const handleEmergencyReturn = async (record: FrogRecord) => {
    try {
      setRecalling(record.tokenId);
      const response = await api.post(`/api/admin/frogs/${record.tokenId}/emergency-return`);
      const result = response as unknown as { success: boolean; txHash: string; message: string };
      message.success(`召回成功！交易哈希: ${result.txHash?.slice(0, 10)}...`);
      fetchFrogs();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '链上召回失败';
      message.error(errorMsg);
    } finally {
      setRecalling(null);
    }
  };

  const columns = [
    { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '拥有者',
      dataIndex: 'ownerAddress',
      key: 'ownerAddress',
      render: (text: string) => (
        <span className="address" style={{ fontSize: 12 }}>
          {text ? `${text.slice(0, 8)}...${text.slice(-6)}` : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
    { title: '经验', dataIndex: 'xp', key: 'xp', width: 80 },
    { title: '旅行次数', dataIndex: 'totalTravels', key: 'totalTravels', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: FrogRecord) => (
        <Space>
          <Button size="small" onClick={() => handleStatusEdit(record)}>
            修改状态
          </Button>
          {(record.status === 'Traveling' || record.status === 'CrossChainLocked') && (
            <Popconfirm
              title="链上召回"
              description="确定要从链上紧急召回此青蛙吗？此操作将调用合约。"
              onConfirm={() => handleEmergencyReturn(record)}
              okText="确认召回"
              cancelText="取消"
            >
              <Button
                size="small"
                type="primary"
                danger
                icon={<RollbackOutlined />}
                loading={recalling === record.tokenId}
              >
                链上召回
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="🐸 青蛙列表"
        extra={
          <Space>
            <Input
              placeholder="搜索 TokenId 或地址"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
            <Button onClick={handleSearch}>搜索</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchFrogs} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={frogs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          size="small"
        />
      </Card>

      {/* 修改状态弹窗 */}
      <Modal
        title={`修改 ${selectedFrog?.name} 状态`}
        open={editModalVisible}
        onOk={handleSaveStatus}
        onCancel={() => setEditModalVisible(false)}
        okText="确认修改"
        cancelText="取消"
      >
        <Descriptions column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Token ID">{selectedFrog?.tokenId}</Descriptions.Item>
          <Descriptions.Item label="当前状态">
            <Tag color={statusColors[selectedFrog?.status || ''] || 'default'}>
              {selectedFrog?.status}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        <Select
          value={newStatus}
          onChange={setNewStatus}
          style={{ width: '100%' }}
          options={[
            { value: 'Idle', label: 'Idle - 空闲' },
            { value: 'Traveling', label: 'Traveling - 旅行中' },
            { value: 'Returning', label: 'Returning - 返程中' },
          ]}
        />
        <div style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
          ⚠️ 修改状态仅影响数据库记录，不会修改链上状态。请谨慎操作。
        </div>
      </Modal>
    </div>
  );
};

export default Frogs;
