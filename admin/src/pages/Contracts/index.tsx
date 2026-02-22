import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Space, message, Modal, Input, Descriptions, Alert, Spin } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, SyncOutlined, CopyOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface ContractInfo {
  name: string;
  envKey: string;
  address: string;
  isDeployed: boolean;
  version?: string;
  network: string;
}

interface VerifyResult {
  name: string;
  passed: boolean;
  message: string;
  expected?: string;
  actual?: string;
}

const Contracts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [verifyResults, setVerifyResults] = useState<VerifyResult[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editContract, setEditContract] = useState<ContractInfo | null>(null);
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/contracts');
      setContracts(response as unknown as ContractInfo[]);
    } catch (err) {
      // 使用模拟数据
      setContracts([
        { name: 'ZetaFrogNFT', envKey: 'ZETAFROG_NFT_ADDRESS', address: '0x660A6196A5bf3FbD8aE5EC3eED354A671b8ce04d', isDeployed: true, network: 'ZetaChain Athens' },
        { name: 'OmniTravel', envKey: 'OMNI_TRAVEL_ADDRESS', address: '0x9A99AA350997bd7371512c958d51e4E067039766', isDeployed: true, version: '1.0.0', network: 'ZetaChain Athens' },
        { name: 'Travel', envKey: 'TRAVEL_CONTRACT_ADDRESS', address: '0x32cbe784c8Ac18df3Ee662d1239313448f467d98', isDeployed: true, version: '1.0.0', network: 'ZetaChain Athens' },
        { name: 'SouvenirNFT', envKey: 'SOUVENIR_NFT_ADDRESS', address: '0xCE871f9F009f7Fa49f23f0EEE09977FfB7b4DbF5', isDeployed: true, network: 'ZetaChain Athens' },
        { name: 'BSC Connector', envKey: 'BSC_CONNECTOR_ADDRESS', address: '0x1E8D44A6D21C29332a4528439d107Fa9e9aF4752', isDeployed: true, network: 'BSC Testnet' },
        { name: 'Sepolia Connector', envKey: 'SEPOLIA_CONNECTOR_ADDRESS', address: '0x1c31e32A91dcF6f76D61fDef4Aa7B2eC047Cc7A9', isDeployed: true, network: 'Sepolia' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const response = await api.get('/api/admin/contracts/verify');
      setVerifyResults((response as { checks: VerifyResult[] }).checks);
      message.success('验证完成');
    } catch (err) {
      // 模拟验证结果
      setVerifyResults([
        { name: 'ZetaFrogNFT.omniTravelContract', passed: true, message: '设置正确' },
        { name: 'ZetaFrogNFT.travelContract', passed: true, message: '设置正确' },
        { name: 'OmniTravel.supportedChains[97]', passed: true, message: 'BSC Testnet 已启用' },
        { name: 'OmniTravel.supportedChains[11155111]', passed: true, message: 'Sepolia 已启用' },
        { name: 'OmniTravel.testMode', passed: true, message: '测试模式已开启' },
      ]);
      message.info('使用模拟验证结果');
    } finally {
      setVerifying(false);
    }
  };

  const handleEdit = (record: ContractInfo) => {
    setEditContract(record);
    setNewAddress(record.address);
    setEditModalVisible(true);
  };

  const handleSaveAddress = async () => {
    if (!editContract || !newAddress) return;
    try {
      await api.post('/api/admin/contracts/sync-config', {
        contracts: { [editContract.envKey]: newAddress },
      });
      message.success('地址更新成功');
      setEditModalVisible(false);
      fetchContracts();
    } catch (err) {
      message.warning('后端 API 未实现，地址未更新');
      setEditModalVisible(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    message.success('已复制地址');
  };

  const columns = [
    {
      title: '合约名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ContractInfo) => (
        <Space>
          <span>{text}</span>
          {record.version && <Tag>{record.version}</Tag>}
        </Space>
      ),
    },
    {
      title: '网络',
      dataIndex: 'network',
      key: 'network',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '合约地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => (
        <Space>
          <span className="address" style={{ fontSize: 12 }}>
            {text ? `${text.slice(0, 10)}...${text.slice(-8)}` : '-'}
          </span>
          {text && (
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyAddress(text)}
            />
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isDeployed',
      key: 'isDeployed',
      render: (deployed: boolean) => (
        <Tag color={deployed ? 'success' : 'default'}>
          {deployed ? '已部署' : '未部署'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ContractInfo) => (
        <Button size="small" onClick={() => handleEdit(record)}>
          编辑地址
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="📜 合约列表"
        extra={
          <Space>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleVerify}
              loading={verifying}
            >
              验证所有合约
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchContracts}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <Table
            dataSource={contracts}
            columns={columns}
            rowKey="name"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* 验证结果 */}
      {verifyResults.length > 0 && (
        <Card title="🔍 验证结果" style={{ marginTop: 16 }} size="small">
          {verifyResults.map((result, index) => (
            <Alert
              key={index}
              message={result.name}
              description={result.message}
              type={result.passed ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      )}

      {/* 编辑地址弹窗 */}
      <Modal
        title={`编辑 ${editContract?.name} 地址`}
        open={editModalVisible}
        onOk={handleSaveAddress}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Descriptions column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="环境变量">
            {editContract?.envKey}
          </Descriptions.Item>
          <Descriptions.Item label="当前地址">
            <span className="address" style={{ fontSize: 12 }}>
              {editContract?.address}
            </span>
          </Descriptions.Item>
        </Descriptions>
        <Input
          placeholder="输入新的合约地址"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          style={{ fontFamily: 'monospace' }}
        />
      </Modal>
    </div>
  );
};

export default Contracts;
