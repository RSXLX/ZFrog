import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Button, Card, Divider, Input, Space, Typography } from 'antd';
import {
  clearAdminSession,
  getAuthMe,
  getStoredAdminAddress,
  getStoredAdminToken,
  hasAdminAuthContext,
  loginWithWalletSignature,
  persistAdminSession,
  requestWalletNonce,
} from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const normalizeAddress = (value: string) => value.trim().toLowerCase();

const walletLoginUnavailableText = '未检测到浏览器钱包扩展，可改用 JWT token 或开发地址兜底。';

interface AdminAuthGateProps {
  children: ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [ready, setReady] = useState(() => hasAdminAuthContext());
  const [addressInput, setAddressInput] = useState(() => getStoredAdminAddress() || '');
  const [tokenInput, setTokenInput] = useState(() => getStoredAdminToken() || '');
  const [error, setError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<'wallet' | 'token' | 'address' | null>(null);

  useEffect(() => {
    const handleAuthRequired = () => {
      setReady(false);
      setError('管理员会话不存在或已失效，请重新认证。');
      setAddressInput(getStoredAdminAddress() || '');
      setTokenInput(getStoredAdminToken() || '');
    };

    window.addEventListener('zfrog-admin-auth-required', handleAuthRequired);
    return () => window.removeEventListener('zfrog-admin-auth-required', handleAuthRequired);
  }, []);

  const finishAuthentication = (params?: { token?: string | null; address?: string | null }) => {
    if (params) {
      persistAdminSession(params);
    }
    setError(null);
    setReady(hasAdminAuthContext());
    setAddressInput(getStoredAdminAddress() || '');
    setTokenInput(getStoredAdminToken() || '');
  };

  const handleWalletLogin = async () => {
    if (!window.ethereum) {
      setError(walletLoginUnavailableText);
      return;
    }

    try {
      setPendingMode('wallet');
      setError(null);

      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];
      const walletAddress = normalizeAddress(accounts?.[0] || '');

      if (!addressPattern.test(walletAddress)) {
        throw new Error('钱包未返回有效地址');
      }

      const noncePayload = await requestWalletNonce(walletAddress);

      let signature: string;
      try {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [noncePayload.message, walletAddress],
        })) as string;
      } catch {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [walletAddress, noncePayload.message],
        })) as string;
      }

      const authPayload = await loginWithWalletSignature({
        walletAddress,
        signature,
      });

      finishAuthentication({
        token: authPayload.token,
        address: authPayload.walletAddress,
      });
    } catch (authError) {
      clearAdminSession();
      setError(getApiErrorMessage(authError, '钱包签名登录失败'));
    } finally {
      setPendingMode(null);
    }
  };

  const handleTokenLogin = async () => {
    const token = tokenInput.trim();
    if (!token) {
      setError('请先输入 JWT token');
      return;
    }

    try {
      setPendingMode('token');
      setError(null);
      persistAdminSession({ token });
      const me = (await getAuthMe()) as { walletAddress?: string };
      finishAuthentication({
        token,
        address: me.walletAddress || null,
      });
    } catch (authError) {
      clearAdminSession();
      setError(getApiErrorMessage(authError, 'JWT token 校验失败'));
    } finally {
      setPendingMode(null);
    }
  };

  const handleAddressLogin = () => {
    const address = normalizeAddress(addressInput);
    if (!addressPattern.test(address)) {
      setError('请输入合法的钱包地址');
      return;
    }

    setPendingMode('address');
    setError(null);
    finishAuthentication({ address });
    setPendingMode(null);
  };

  if (ready) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top, rgba(16, 185, 129, 0.14), transparent 40%), #0b1120',
      }}
    >
      <Card
        title="ZetaFrog Admin 认证"
        style={{ width: 'min(760px, 100%)', borderRadius: 20 }}
        styles={{ body: { padding: 24 } }}
      >
        <Space vertical size="large" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            title="管理员控制台需要认证后才会请求 /api/admin/*"
            description="之前页面首屏直接拉取仪表盘数据，在没有 token 或管理员地址时必然返回 401。现在会先进入认证门禁。"
          />

          {error && (
            <Alert
              type="error"
              showIcon
              title="认证失败"
              description={error}
            />
          )}

          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              1. 钱包签名登录
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              推荐方式。会调用 `/api/v1/auth/nonce` 和 `/api/v1/auth/wallet` 换取管理员 JWT。
            </Typography.Paragraph>
            <Space vertical style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                onClick={handleWalletLogin}
                loading={pendingMode === 'wallet'}
                disabled={!window.ethereum}
              >
                连接钱包并登录
              </Button>
              {!window.ethereum && (
                <Typography.Text type="secondary">
                  {walletLoginUnavailableText}
                </Typography.Text>
              )}
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              2. 粘贴 JWT token
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              适用于你已经从其它入口拿到管理员 token 的情况。
            </Typography.Paragraph>
            <Space vertical style={{ width: '100%' }}>
              <Input.TextArea
                rows={4}
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button
                onClick={handleTokenLogin}
                loading={pendingMode === 'token'}
              >
                使用 Token 进入
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              3. 本地开发地址兜底
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              仅在后端非生产环境可用，会通过 `x-admin-address` 走开发态兜底。若后端配置了 `ADMIN_ADDRESSES`，该地址仍需在白名单内。
            </Typography.Paragraph>
            <Space vertical style={{ width: '100%' }}>
              <Input
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                placeholder="0x..."
                autoComplete="off"
              />
              <Button
                onClick={handleAddressLogin}
                loading={pendingMode === 'address'}
              >
                使用管理员地址进入
              </Button>
            </Space>
          </div>

          <Typography.Text type="secondary">
            如果你希望本地打开 `http://localhost:3002/` 就自动进入，也可以在启动 admin 前配置 `VITE_ADMIN_ADDRESS`。
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
