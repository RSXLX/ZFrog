import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

interface BadgeRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlockType: string;
  unlockCondition: Record<string, unknown>;
  rarity: number;
  isHidden: boolean;
  airdropAmount?: string;
  airdropEnabled?: boolean;
}

const unlockTypes = [
  { value: 'TRIP_COUNT', label: '旅行次数' },
  { value: 'CHAIN_VISIT', label: '链访问' },
  { value: 'MULTI_CHAIN', label: '多链旅行' },
  { value: 'RARE_FIND', label: '稀有发现' },
  { value: 'SPECIAL', label: '特殊成就' },
  { value: 'SOCIAL', label: '社交互动' },
  { value: 'COLLECTION', label: '收藏成就' },
];

const Badges: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/badges');
      setBadges(response as unknown as BadgeRecord[]);
      setLoadError(null);
    } catch (err) {
      setBadges([]);
      setLoadError(getApiErrorMessage(err, '加载徽章列表失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBadge(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: BadgeRecord) => {
    setEditingBadge(record);
    form.setFieldsValue({
      ...record,
      unlockCondition: JSON.stringify(record.unlockCondition, null, 2),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/admin/badges/${id}`);
      message.success('删除成功');
      fetchBadges();
    } catch (err) {
      message.error(getApiErrorMessage(err, '删除徽章失败'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let unlockCondition = {};
      const rawCondition = String(values.unlockCondition || '').trim();

      if (rawCondition) {
        try {
          unlockCondition = JSON.parse(rawCondition);
        } catch {
          message.error('解锁条件 JSON 格式错误');
          return;
        }
      }

      const payload = {
        ...values,
        unlockCondition,
      };

      if (editingBadge) {
        await api.put(`/api/admin/badges/${editingBadge.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/api/admin/badges', payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchBadges();
    } catch (err) {
      message.error(getApiErrorMessage(err, editingBadge ? '更新徽章失败' : '创建徽章失败'));
    }
  };

  const columns = [
    { title: '图标', dataIndex: 'icon', key: 'icon', width: 60 },
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '解锁类型',
      dataIndex: 'unlockType',
      key: 'unlockType',
      render: (type: string) => {
        const found = unlockTypes.find((t) => t.value === type);
        return <Tag>{found?.label || type}</Tag>;
      },
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (rarity: number) => '⭐'.repeat(rarity),
    },
    {
      title: '隐藏',
      dataIndex: 'isHidden',
      key: 'isHidden',
      render: (hidden: boolean) => (hidden ? <Tag color="orange">隐藏</Tag> : '-'),
    },
    {
      title: '空投奖励',
      dataIndex: 'airdropAmount',
      key: 'airdropAmount',
      render: (amount: string, record: BadgeRecord) => {
        if (!amount || !record.airdropEnabled) return <Tag>-</Tag>;
        const zeta = Number(BigInt(amount)) / 1e18;
        return <Tag color="gold">🎁 {zeta} ZETA</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: BadgeRecord) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此徽章？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="🏆 徽章管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加徽章
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchBadges} loading={loading}>
              刷新
            </Button>
          </Space>
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
          dataSource={badges}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 添加/编辑徽章弹窗 */}
      <Modal
        title={editingBadge ? '编辑徽章' : '添加徽章'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="徽章代码" rules={[{ required: true }]}>
            <Input placeholder="如：FIRST_TRIP" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="徽章显示名称" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea placeholder="徽章描述" rows={2} />
          </Form.Item>
          <Form.Item name="icon" label="图标" rules={[{ required: true }]}>
            <Input placeholder="Emoji 图标，如：🚀" />
          </Form.Item>
          <Form.Item name="unlockType" label="解锁类型" rules={[{ required: true }]}>
            <Select options={unlockTypes} placeholder="选择解锁类型" />
          </Form.Item>
          <Form.Item name="unlockCondition" label="解锁条件 (JSON)">
            <Input.TextArea placeholder='{"count": 1}' rows={3} />
          </Form.Item>
          <Form.Item name="rarity" label="稀有度 (1-5)" initialValue={1}>
            <InputNumber min={1} max={5} />
          </Form.Item>
          <Form.Item name="airdropAmount" label="空投金额 (wei)">
            <Input placeholder="如：1000000000000000000 (1 ZETA)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Badges;
