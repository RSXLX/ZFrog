import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, message, Input, Space, Divider, Alert } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface ConfigData {
  rpc: {
    zetachain: string;
    bscTestnet: string;
    ethSepolia: string;
  };
  contracts: {
    zetaFrogNFT: string;
    omniTravel: string;
    travel: string;
    souvenir: string;
  };
}

const Config: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/config');
      setConfig(response as unknown as ConfigData);
    } catch (err) {
      // 使用模拟数据
      setConfig({
        rpc: {
          zetachain: 'https://zetachain-athens.g.allthatnode.com/archive/evm/***',
          bscTestnet: 'https://bsc-testnet.g.allthatnode.com/full/evm/***',
          ethSepolia: 'https://ethereum-sepolia.g.allthatnode.com/full/evm/***',
        },
        contracts: {
          zetaFrogNFT: '0x660A6196A5bf3FbD8aE5EC3eED354A671b8ce04d',
          omniTravel: '0x9A99AA350997bd7371512c958d51e4E067039766',
          travel: '0x32cbe784c8Ac18df3Ee662d1239313448f467d98',
          souvenir: '0xCE871f9F009f7Fa49f23f0EEE09977FfB7b4DbF5',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/api/admin/config', config);
      message.success('配置保存成功');
    } catch (err) {
      message.warning('后端 API 未实现，配置未保存');
    } finally {
      setSaving(false);
    }
  };

  const updateRpc = (key: keyof ConfigData['rpc'], value: string) => {
    if (config) {
      setConfig({
        ...config,
        rpc: { ...config.rpc, [key]: value },
      });
    }
  };

  const updateContract = (key: keyof ConfigData['contracts'], value: string) => {
    if (config) {
      setConfig({
        ...config,
        contracts: { ...config.contracts, [key]: value },
      });
    }
  };

  return (
    <div>
      <Alert
        message="配置说明"
        description="修改配置后需要点击保存按钮，保存后需要重启后端和前端服务才能生效。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        title="⚙️ 系统配置"
        loading={loading}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchConfig}>
              刷新
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存配置
            </Button>
          </Space>
        }
      >
        {/* RPC 配置 */}
        <Divider orientation="left">RPC 配置</Divider>
        <Descriptions column={1} labelStyle={{ width: 150 }}>
          <Descriptions.Item label="ZetaChain Athens">
            <Input
              value={config?.rpc.zetachain || ''}
              onChange={(e) => updateRpc('zetachain', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="BSC Testnet">
            <Input
              value={config?.rpc.bscTestnet || ''}
              onChange={(e) => updateRpc('bscTestnet', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="ETH Sepolia">
            <Input
              value={config?.rpc.ethSepolia || ''}
              onChange={(e) => updateRpc('ethSepolia', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
        </Descriptions>

        {/* 合约地址配置 */}
        <Divider orientation="left">合约地址配置</Divider>
        <Descriptions column={1} labelStyle={{ width: 150 }}>
          <Descriptions.Item label="ZetaFrogNFT">
            <Input
              value={config?.contracts.zetaFrogNFT || ''}
              onChange={(e) => updateContract('zetaFrogNFT', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="OmniTravel">
            <Input
              value={config?.contracts.omniTravel || ''}
              onChange={(e) => updateContract('omniTravel', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Travel">
            <Input
              value={config?.contracts.travel || ''}
              onChange={(e) => updateContract('travel', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="SouvenirNFT">
            <Input
              value={config?.contracts.souvenir || ''}
              onChange={(e) => updateContract('souvenir', e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default Config;
