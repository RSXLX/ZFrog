import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, message, Popconfirm } from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

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

  useEffect(() => {
    fetchFriendships();
  }, []);

  const fetchFriendships = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/friends');
      setFriendships(response as unknown as FriendshipRecord[]);
    } catch (err) {
      // 模拟数据
      setFriendships([
        { id: 1, requesterId: 1, addresseeId: 2, requesterName: 'Frog #1', addresseeName: 'Frog #2', status: 'Accepted', affinityLevel: 3, groupTravelCount: 2, createdAt: '2026-01-12' },
        { id: 2, requesterId: 3, addresseeId: 1, requesterName: 'Frog #3', addresseeName: 'Frog #1', status: 'Pending', affinityLevel: 1, groupTravelCount: 0, createdAt: '2026-01-14' },
      ]);
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
      message.warning('后端 API 未实现');
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
