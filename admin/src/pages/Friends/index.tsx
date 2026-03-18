import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, message, Popconfirm, Alert } from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface FriendshipRecord {
  id: number;
  requesterId: number;
  addresseeId: number;
  requesterName: string;
  addresseeName: string;
  status: string;
  affinityLevel: number;
  groupTravelCount: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  Pending: 'processing',
  Accepted: 'success',
  Declined: 'error',
  Blocked: 'default',
};

const Friends: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [friendships, setFriendships] = useState<FriendshipRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriendships();
  }, []);

  const fetchFriendships = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/friends');
      setFriendships(response as unknown as FriendshipRecord[]);
      setLoadError(null);
    } catch (err) {
      setFriendships([]);
      setLoadError(getApiErrorMessage(err, '加载好友关系失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/admin/friends/${id}`);
      message.success('删除成功');
      fetchFriendships();
    } catch (err) {
      message.error(getApiErrorMessage(err, '删除好友关系失败'));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '请求者', dataIndex: 'requesterName', key: 'requesterName' },
    { title: '接收者', dataIndex: 'addresseeName', key: 'addresseeName' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '友情等级',
      dataIndex: 'affinityLevel',
      key: 'affinityLevel',
      render: (level: number) => `Lv.${level}`,
    },
    { title: '结伴旅行次数', dataIndex: 'groupTravelCount', key: 'groupTravelCount' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: FriendshipRecord) => (
        <Popconfirm
          title="确定删除此好友关系？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="👫 好友关系管理"
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchFriendships} loading={loading}>
          刷新
        </Button>
      }
    >
      {loadError && (
        <Alert
          type="error"
          showIcon
          message="加载失败"
          description={loadError}
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        dataSource={friendships}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );
};

export default Friends;
