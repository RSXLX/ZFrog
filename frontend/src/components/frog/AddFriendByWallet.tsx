import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface AddFriendByWalletProps {
  currentFrogId: number;
  onFriendAdded?: () => void;
  onClose: () => void;
}

const AddFriendByWallet: React.FC<AddFriendByWalletProps> = ({
  currentFrogId,
  onFriendAdded,
  onClose
}) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundFrog, setFoundFrog] = useState<any>(null);

  const validateWalletAddress = (address: string) => {
    // 简单的以太坊地址验证
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const searchByWallet = async () => {
    if (!walletAddress.trim()) {
      setError('请输入钱包地址');
      return;
    }

    if (!validateWalletAddress(walletAddress)) {
      setError('请输入有效的以太坊钱包地址 (0x...)');
      return;
    }

    setLoading(true);
    setError('');
    setFoundFrog(null);

    try {
      const response = await apiService.get(`/frogs/search`, {
        params: {
          query: walletAddress,
          limit: 1
        }
      });

      if (response.success && response.data.length > 0) {
        const frog = response.data[0];
        
        // 检查是否是自己的青蛙
        if (frog.tokenId === currentFrogId) {
          setError('不能添加自己的青蛙为好友');
          return;
        }

        // 检查是否已经是好友
        try {
          const friendsResponse = await apiService.get(`/friends/list/${currentFrogId}`);
          const friendIds = friendsResponse.success ? friendsResponse.data.map((friend: any) => friend.tokenId) : [];
          
          if (friendIds.includes(frog.tokenId)) {
            setError('该青蛙已经是您的好友');
            return;
          }
        } catch {
          // 忽略错误，继续处理
        }

        setFoundFrog(frog);
      } else {
        setError('未找到该钱包地址对应的青蛙');
      }
    } catch (err: any) {
      console.error('Error searching by wallet:', err);
      setError(err.response?.data?.error || '搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!foundFrog) return;

    setLoading(true);
    try {
      await apiService.post('/friends/request', {
        requesterId: currentFrogId,
        walletAddress: foundFrog.ownerAddress
      });

      onFriendAdded?.();
      alert('好友请求已发送！');
      onClose();
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      setError(err.response?.data?.error || '发送好友请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Idle': return 'idle';
      case 'Traveling': return 'traveling';
      case 'Returning': return 'returning';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Idle': return '空闲';
      case 'Traveling': return '旅行中';
      case 'Returning': return '返回中';
      default: return '未知状态';
    }
  };

  return (
    <div className="friend-modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="friend-modal">
        <div className="friend-modal-header">
          <h3 className="friend-modal-title">🔗 链上地址添加</h3>
          <button className="friend-modal-close" onClick={onClose}>×</button>
        </div>

        {/* 钱包地址输入 */}
        <div className="friend-form-group">
          <label className="friend-form-label">Wallet Address</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchByWallet()}
            placeholder="0x..."
            className="friend-form-input"
            style={{ fontFamily: 'monospace' }}
          />
          {error && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
          )}
        </div>

        {/* 搜索结果 */}
        {foundFrog && (
          <div className="request-card" style={{ background: '#e8f5e9', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <span style={{ fontWeight: '600' }}>找到青蛙！</span>
            </div>
            <div className="request-header">
              <div className="request-info">
                <div className="request-avatar">🐸</div>
                <div>
                  <div className="request-name">{foundFrog.name}</div>
                  <div className="request-meta">
                    Lv.{foundFrog.level} • 旅行 {foundFrog.totalTravels} 次
                  </div>
                </div>
              </div>
              <span className={`friend-status ${getStatusClass(foundFrog.status)}`}>
                {getStatusText(foundFrog.status)}
              </span>
            </div>
            
            <button
              onClick={sendFriendRequest}
              disabled={loading}
              className="action-btn primary"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              {loading ? '⏳ 发送中...' : '➕ 发送好友请求'}
            </button>
          </div>
        )}

        {/* 搜索按钮 */}
        {!foundFrog && (
          <button
            onClick={searchByWallet}
            disabled={loading || !walletAddress.trim()}
            className="friend-btn friend-btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? '⏳ 搜索中...' : '发送请求'}
          </button>
        )}

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            💡 输入完整的以太坊钱包地址(0x开头的42位字符)来添加蛙友
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddFriendByWallet;