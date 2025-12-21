import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFrogData } from '../hooks/useFrogData';
import FriendsList from '../components/frog/FriendsList';
import FriendRequests from '../components/frog/FriendRequests';
import FriendInteractionModal from '../components/frog/FriendInteraction';
import AddFriend from '../components/frog/AddFriend';
import AddFriendByWallet from '../components/frog/AddFriendByWallet';
import WorldOnlineList from '../components/frog/WorldOnlineList';
import { Frog } from '../types';

export const Friends: React.FC = () => {
  const { frogId } = useParams<{ frogId: string }>();
  const { frog, loading } = useFrogData(parseInt(frogId || '0'));
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddFriendByWallet, setShowAddFriendByWallet] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Frog | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'world'>('friends');
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (!frog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">青蛙未找到</h1>
          <p className="text-gray-600">请检查青蛙ID是否正确</p>
        </div>
      </div>
    );
  }

  const handleInteractionClick = (friend: Frog, friendshipId: number) => {
    setSelectedFriend(friend);
    setSelectedFriendshipId(friendshipId);
  };

  const handleCloseInteraction = () => {
    setSelectedFriend(null);
    setSelectedFriendshipId(null);
  };

  const handleInteractionComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRequestProcessed = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFriendAdded = () => {
    setShowAddFriend(false);
    setShowAddFriendByWallet(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {frog.name} 的好友系统
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>等级 {frog.level}</span>
          <span>•</span>
          <span>经验值 {frog.xp}</span>
          <span>•</span>
          <span>旅行 {frog.totalTravels} 次</span>
          <span>•</span>
          <span className={`font-medium ${
            frog.status === 'Idle' ? 'text-green-600' :
            frog.status === 'Traveling' ? 'text-blue-600' : 'text-orange-600'
          }`}>
            {frog.status === 'Idle' ? '空闲' :
             frog.status === 'Traveling' ? '旅行中' : '返回中'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* 左侧：好友请求 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
            <FriendRequests
              frogId={frog.id}
              onRequestProcessed={handleRequestProcessed}
            />
          </div>
        </div>

        {/* 右侧：好友列表 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
{/* 标签页导航 */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('friends')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'friends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                好友列表
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                好友请求
              </button>
              <button
                onClick={() => setActiveTab('world')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'world'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🌍 世界在线
              </button>
            </nav>
          </div>

            {/* 添加好友按钮 - 只在好友列表和世界在线标签页显示 */}
            {(activeTab === 'friends' || activeTab === 'world') && (
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {activeTab === 'friends' ? '好友列表' : '世界在线青蛙'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddFriendByWallet(true)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    钱包地址添加
                  </button>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    搜索添加
                  </button>
                </div>
              </div>
            )}

            {/* 好友列表标签页 */}
            {activeTab === 'friends' && (
              <FriendsList
                key={refreshKey}
                frogId={frog.id}
                onInteractionClick={handleInteractionClick}
              />
            )}

            {/* 好友请求标签页 */}
            {activeTab === 'requests' && (
              <FriendRequests
                frogId={frog.id}
                onRequestProcessed={handleRequestProcessed}
              />
            )}

            {/* 世界在线标签页 */}
            {activeTab === 'world' && (
              <WorldOnlineList
                currentFrogId={frog.id}
                onFriendAdded={handleFriendAdded}
              />
            )}
          </div>
        </div>
      </div>

      {/* 互动弹窗 */}
      {selectedFriend && selectedFriendshipId && (
        <FriendInteractionModal
          friend={selectedFriend}
          friendshipId={selectedFriendshipId}
          currentFrogId={frog.id}
          onClose={handleCloseInteraction}
          onInteractionComplete={handleInteractionComplete}
        />
      )}

      {/* 添加好友弹窗 */}
      {showAddFriend && (
        <AddFriend
          currentFrogId={frog.id}
          onFriendAdded={handleFriendAdded}
          onClose={() => setShowAddFriend(false)}
        />
      )}

      {/* 钱包地址添加好友弹窗 */}
      {showAddFriendByWallet && (
        <AddFriendByWallet
          currentFrogId={frog.id}
          onFriendAdded={handleFriendAdded}
          onClose={() => setShowAddFriendByWallet(false)}
        />
      )}
    </div>
  );
};