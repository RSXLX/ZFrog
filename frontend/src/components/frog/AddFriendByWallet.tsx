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
        if (frog.id === currentFrogId) {
          setError('不能添加自己的青蛙为好友');
          return;
        }

        // 检查是否已经是好友
        try {
          const friendsResponse = await apiService.get(`/friends/list/${currentFrogId}`);
          const friendIds = friendsResponse.success ? friendsResponse.data.map((friend: any) => friend.id) : [];
          
          if (friendIds.includes(frog.id)) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Idle': return 'text-green-600';
      case 'Traveling': return 'text-blue-600';
      case 'Returning': return 'text-orange-600';
      default: return 'text-gray-600';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold">通过钱包地址添加蛙友</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 钱包地址输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            输入钱包地址
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchByWallet()}
              placeholder="0x..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <button
              onClick={searchByWallet}
              disabled={loading || !walletAddress.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* 搜索结果 */}
        {foundFrog && (
          <div className="border rounded-lg p-4 bg-green-50">
            <h4 className="font-semibold text-lg mb-2">找到青蛙！</h4>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{foundFrog.name}</h4>
              <span className={`text-sm ${getStatusColor(foundFrog.status)}`}>
                {getStatusText(foundFrog.status)}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mb-3">
              等级 {foundFrog.level} • 经验值 {foundFrog.xp} • 旅行 {foundFrog.totalTravels} 次
            </div>
            
            <div className="text-xs text-gray-500 mb-3 font-mono bg-gray-100 p-2 rounded">
              钱包地址: {foundFrog.ownerAddress}
            </div>
            
            <button
              onClick={sendFriendRequest}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送好友请求'}
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            💡 输入完整的以太坊钱包地址(0x开头的42位字符)来添加蛙友
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddFriendByWallet;