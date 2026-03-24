import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import storage from '../../services/storage';

interface SettingsDialogProps {
  visible: boolean;
  onClose: () => void;
  onAuthUpdated?: (walletAddress: string | null) => void;
}

const isWalletAddress = (value: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const shortValue = (value?: string | null): string => {
  if (!value) return '--';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

const SettingsDialog: React.FC<SettingsDialogProps> = ({ visible, onClose, onAuthUpdated }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPatrol, setAutoPatrol] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [councilBriefNotifications, setCouncilBriefNotifications] = useState(true);
  const [relationshipAwareReminders, setRelationshipAwareReminders] = useState(true);
  const [startWithSystem, setStartWithSystem] = useState(false);

  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState(7001);
  const [signature, setSignature] = useState('');
  const [nonceMessage, setNonceMessage] = useState('');
  const [nonceExpiresAt, setNonceExpiresAt] = useState<string | null>(null);
  const [loadingNonce, setLoadingNonce] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const authToken = useMemo(() => storage.getAuthToken(), [visible, authSuccess]);
  const currentWallet = useMemo(() => storage.getWalletAddress(), [visible, authSuccess]);

  const updateDesktopSettings = useCallback(
    (next: Partial<ReturnType<typeof storage.getSettings>>) => {
      storage.setSettings(next);
      window.dispatchEvent(
        new CustomEvent('desktop:settings-updated', {
          detail: storage.getSettings(),
        })
      );
    },
    []
  );

  useEffect(() => {
    if (!visible) return;
    const settings = storage.getSettings();
    setWalletAddress(storage.getWalletAddress() || '');
    setDesktopNotifications(settings.notifications !== false);
    setCouncilBriefNotifications(settings.councilBriefNotifications !== false);
    setRelationshipAwareReminders(settings.relationshipAwareReminders !== false);
    setStartWithSystem(settings.startWithSystem === true);
    setSignature('');
    setNonceMessage('');
    setNonceExpiresAt(null);
    setAuthError('');
    setAuthSuccess('');
  }, [visible]);

  const requestNonce = async () => {
    const normalized = walletAddress.trim().toLowerCase();
    if (!isWalletAddress(normalized)) {
      setAuthError('请输入有效钱包地址（0x 开头 42 位）');
      return;
    }

    setLoadingNonce(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      const nonce = await api.issueAuthNonce(normalized);
      if (!nonce) {
        setAuthError('获取 nonce 失败，请检查后端 /api/v1/auth/nonce');
        return;
      }
      setNonceMessage(nonce.message);
      setNonceExpiresAt(nonce.expiresAt);
      storage.setWalletAddress(normalized);
      onAuthUpdated?.(normalized);
    } catch (error: any) {
      setAuthError(error?.message || '获取 nonce 失败');
    } finally {
      setLoadingNonce(false);
    }
  };

  const loginWithSignature = async () => {
    const normalized = walletAddress.trim().toLowerCase();
    if (!isWalletAddress(normalized)) {
      setAuthError('请输入有效钱包地址（0x 开头 42 位）');
      return;
    }
    if (!nonceMessage) {
      setAuthError('请先获取 nonce 签名消息');
      return;
    }
    if (!signature.trim()) {
      setAuthError('请输入签名结果');
      return;
    }

    setLoadingLogin(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      const result = await api.loginWithWalletSignature({
        walletAddress: normalized,
        signature: signature.trim(),
        chainId: Number(chainId) || 7001,
      });

      if (!result?.token) {
        setAuthError('登录失败：未拿到 token');
        return;
      }

      storage.setWalletAddress(result.walletAddress);
      storage.setAuthToken(result.token);
      setAuthSuccess(
        `登录成功：${shortValue(result.walletAddress)}，${result.hasFrog ? '已绑定青蛙' : '暂无青蛙'}`
      );
      setNonceMessage('');
      setSignature('');

      window.dispatchEvent(
        new CustomEvent('desktop:auth-updated', {
          detail: {
            walletAddress: result.walletAddress,
            hasToken: true,
            frogTokenId: result.frogTokenId,
          },
        })
      );
      onAuthUpdated?.(result.walletAddress);
    } catch (error: any) {
      setAuthError(error?.message || '登录失败');
    } finally {
      setLoadingLogin(false);
    }
  };

  const copyMessage = async () => {
    if (!nonceMessage) return;
    try {
      await navigator.clipboard.writeText(nonceMessage);
      setAuthSuccess('签名消息已复制');
    } catch {
      setAuthError('复制失败，请手动复制消息');
    }
  };

  const logout = () => {
    storage.clearAuthToken();
    storage.clearActiveFrogId();
    setSignature('');
    setNonceMessage('');
    setNonceExpiresAt(null);
    setAuthSuccess('已退出登录');
    window.dispatchEvent(
      new CustomEvent('desktop:auth-updated', {
        detail: {
          walletAddress: storage.getWalletAddress(),
          hasToken: false,
        },
      })
    );
    onAuthUpdated?.(storage.getWalletAddress());
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', maxHeight: '82vh', overflowY: 'auto' }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>

            <h2 className="dialog-title">⚙️ 设置</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  border: '1px solid #dbeafe',
                  borderRadius: 12,
                  padding: 12,
                  background: '#f8fbff',
                }}
              >
                <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>🔐 桌宠登录（获取 JWT）</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                  流程：输入钱包地址 → 获取签名消息 → 在钱包签名 → 粘贴签名换 token。
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
                  当前钱包：{shortValue(currentWallet)}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  Token：{authToken ? `已登录 (${shortValue(authToken)})` : '未登录'}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    value={walletAddress}
                    onChange={event => setWalletAddress(event.target.value)}
                    placeholder="0x..."
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: '8px 10px',
                      fontSize: 12,
                    }}
                  />
                  <input
                    value={chainId}
                    onChange={event => setChainId(Number(event.target.value) || 7001)}
                    placeholder="chainId (默认 7001)"
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: '8px 10px',
                      fontSize: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={requestNonce}
                      disabled={loadingNonce}
                      style={{
                        flex: 1,
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#2563eb',
                        color: '#fff',
                        cursor: loadingNonce ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: loadingNonce ? 0.7 : 1,
                      }}
                    >
                      {loadingNonce ? '获取中...' : '1) 获取签名消息'}
                    </button>
                    <button
                      onClick={copyMessage}
                      disabled={!nonceMessage}
                      style={{
                        border: '1px solid #93c5fd',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        cursor: nonceMessage ? 'pointer' : 'not-allowed',
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: nonceMessage ? 1 : 0.6,
                      }}
                    >
                      复制消息
                    </button>
                  </div>
                  {nonceMessage ? (
                    <textarea
                      readOnly
                      value={nonceMessage}
                      rows={4}
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        padding: 8,
                        fontSize: 11,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        background: '#fff',
                      }}
                    />
                  ) : null}
                  {nonceExpiresAt ? (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      nonce 过期时间：{new Date(nonceExpiresAt).toLocaleString()}
                    </div>
                  ) : null}
                  <textarea
                    value={signature}
                    onChange={event => setSignature(event.target.value)}
                    placeholder="2) 粘贴钱包签名（0x...）"
                    rows={3}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: 8,
                      fontSize: 11,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={loginWithSignature}
                      disabled={loadingLogin}
                      style={{
                        flex: 1,
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#16a34a',
                        color: '#fff',
                        cursor: loadingLogin ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: loadingLogin ? 0.7 : 1,
                      }}
                    >
                      {loadingLogin ? '登录中...' : '2) 提交签名登录'}
                    </button>
                    <button
                      onClick={logout}
                      style={{
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      退出
                    </button>
                  </div>
                </div>

                {authError ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{authError}</div>
                ) : null}
                {authSuccess ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a' }}>{authSuccess}</div>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🔊 音效</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: soundEnabled ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {soundEnabled ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🎯 自动巡逻</span>
                <button
                  onClick={() => setAutoPatrol(!autoPatrol)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: autoPatrol ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {autoPatrol ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🔔 桌宠通知</span>
                <button
                  onClick={() => {
                    const next = !desktopNotifications;
                    setDesktopNotifications(next);
                    updateDesktopSettings({ notifications: next });
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: desktopNotifications ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {desktopNotifications ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>📰 议会周报提醒</span>
                <button
                  onClick={() => {
                    const next = !councilBriefNotifications;
                    setCouncilBriefNotifications(next);
                    updateDesktopSettings({ councilBriefNotifications: next });
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: councilBriefNotifications ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {councilBriefNotifications ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🤝 关系上下文提醒</span>
                <button
                  onClick={() => {
                    const next = !relationshipAwareReminders;
                    setRelationshipAwareReminders(next);
                    updateDesktopSettings({ relationshipAwareReminders: next });
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: relationshipAwareReminders ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {relationshipAwareReminders ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🚀 开机启动</span>
                <button
                  onClick={() => {
                    const next = !startWithSystem;
                    setStartWithSystem(next);
                    updateDesktopSettings({ startWithSystem: next });
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: startWithSystem ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {startWithSystem ? '开启' : '关闭'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 8, color: '#888', fontSize: 12 }}>
                <p>ZetaFrog 🐸 v1.0.0</p>
                <p>基于 Electron + React</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog;
