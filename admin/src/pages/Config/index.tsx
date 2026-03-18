import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, message, Input, Space, Divider, Alert } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/config');
      setConfig(response as unknown as ConfigData);
      setLoadError(null);
    } catch (err) {
      setConfig(null);
      setLoadError(getApiErrorMessage(err, '加载系统配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) {
      message.error('当前无可保存配置');
      return;
    }
    try {
      setSaving(true);
      await api.put('/api/admin/config', config);
      message.success('配置保存成功');
    } catch (err) {
      message.error(getApiErrorMessage(err, '配置保存失败'));
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
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!config}>
              保存配置
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
        {/* RPC 配置 */}
        <Divider>RPC 配置</Divider>
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
        <Divider>合约地址配置</Divider>
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
