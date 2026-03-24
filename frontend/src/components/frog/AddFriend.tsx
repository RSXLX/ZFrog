import React, { useState } from 'react';
import { Frog } from '../../types';
import { frogFeatureApi } from '../../features/frog/api';
import { socialFeatureApi } from '../../features/social/api';

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
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const searchResult = await frogFeatureApi.search(searchTerm, 10);

      if (searchResult.length > 0) {
        // 过滤掉自己
        const filteredResults = searchResult.filter((frog: Frog) => 
          frog.tokenId !== currentFrogId
        );
        
        // 获取当前青蛙的好友列表，进一步过滤
        try {
          const friends = await socialFeatureApi.listFriends(currentFrogId);
          const friendIds = friends.map((friend: any) => friend.tokenId);
          
          const finalResults = filteredResults.filter((frog: Frog) => 
            !friendIds.includes(frog.tokenId)
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

  const sendFriendRequest = async (targetFrogId: number, walletAddress?: string) => {
    setSendingRequest(targetFrogId);
    try {
      const requestData: any = {
        requesterId: currentFrogId
      };

      // 优先使用钱包地址发送请求
      if (walletAddress) {
        requestData.walletAddress = walletAddress;
      } else {
        requestData.addresseeId = targetFrogId;
      }

      await socialFeatureApi.sendFriendRequest(requestData);
      
      // 从搜索结果中移除已发送请求的青蛙
      setSearchResults(searchResults.filter(frog => frog.tokenId !== targetFrogId));
      onFriendAdded?.();
      alert('好友请求已发送！');
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.error || '发送好友请求失败');
    } finally {
      setSendingRequest(null);
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
      <div className="friend-modal" style={{ maxWidth: '450px' }}>
        <div className="friend-modal-header">
          <h3 className="friend-modal-title">🔍 搜索添加</h3>
          <button className="friend-modal-close" onClick={onClose}>×</button>
        </div>

        {/* 搜索框 */}
        <div className="friend-form-group">
          <label className="friend-form-label">
            通过昵称或ID搜索蛙友
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入昵称或ID..."
              className="friend-form-input"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="friend-btn friend-btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {searching ? '⏳' : '搜索'}
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {searchResults.length === 0 ? (
            <div className="empty-requests" style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</span>
              <p style={{ fontSize: '0.9rem' }}>
                {searching ? '搜索中...' : '输入关键词查找并添加蛙友'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {searchResults.map((frog) => (
                <div key={frog.id} className="request-card">
                  <div className="request-header">
                    <div className="request-info">
                      <div className="request-avatar">🐸</div>
                      <div>
                        <div className="request-name">{frog.name}</div>
                        <div className="request-meta">
                          Lv.{frog.level} • 旅行 {frog.totalTravels} 次
                        </div>
                      </div>
                    </div>
                    <span className={`friend-status ${getStatusClass(frog.status)}`}>
                      {getStatusText(frog.status)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => sendFriendRequest(frog.tokenId, frog.ownerAddress)}
                    disabled={sendingRequest === frog.tokenId}
                    className="action-btn primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    {sendingRequest === frog.tokenId ? '⏳ 发送中...' : '➕ 发送好友请求'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            💡 提示：输入准确的名字可以更快找到蛙友
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddFriend;
