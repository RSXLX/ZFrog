import React, { useState } from 'react';
import { Frog } from '../../types';
import { apiService } from '../../services/api';

interface AddFriendProps {
  currentFrogId: number;
  onFriendAdded?: () => void;
  onClose: () => void;
}

const AddFriend: React.FC<AddFriendProps> = ({
  currentFrogId,
  onFriendAdded,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Frog[]>([]);
  // @ts-ignore
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const response = await apiService.get(`/frogs/search`, {
        params: {
          query: searchTerm,
          limit: 10
        }
      });
      
      if (response.success && response.data.length > 0) {
        // 过滤掉自己
        const filteredResults = response.data.filter((frog: Frog) => 
          frog.id !== currentFrogId
        );
        
        // 获取当前青蛙的好友列表，进一步过滤
        try {
          const friendsResponse = await apiService.get(`/friends/list/${currentFrogId}`);
          const friendIds = friendsResponse.success ? friendsResponse.data.map((friend: any) => friend.id) : [];
          
          const finalResults = filteredResults.filter((frog: Frog) => 
            !friendIds.includes(frog.id)
          );
          
          setSearchResults(finalResults);
        } catch {
          setSearchResults(filteredResults);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching frogs:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (targetFrogId: number) => {
    setSendingRequest(targetFrogId);
    try {
      await apiService.post('/friends/request', {
        requesterId: currentFrogId,
        addresseeId: targetFrogId
      });
      
      // 从搜索结果中移除已发送请求的青蛙
      setSearchResults(searchResults.filter(frog => frog.id !== targetFrogId));
      onFriendAdded?.();
      alert('好友请求已发送！');
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.error || '发送好友请求失败');
    } finally {
      setSendingRequest(null);
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
          <h3 className="text-lg sm:text-xl font-semibold">添加好友</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索青蛙
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入钱包地址、青蛙名称或tokenId..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-80 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searching ? '搜索中...' : '输入钱包地址搜索青蛙'}
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((frog) => (
                <div key={frog.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{frog.name}</h4>
                    <span className={`text-sm ${getStatusColor(frog.status)}`}>
                      {getStatusText(frog.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    等级 {frog.level} • 经验值 {frog.xp} • 旅行 {frog.totalTravels} 次
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-3 font-mono">
                    {frog.ownerAddress}
                  </div>
                  
                  <button
                    onClick={() => sendFriendRequest(frog.id)}
                    disabled={sendingRequest === frog.id}
                    className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {sendingRequest === frog.id ? '发送中...' : '发送好友请求'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            提示：支持按钱包地址(0x...)、青蛙名称或tokenId搜索
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddFriend;