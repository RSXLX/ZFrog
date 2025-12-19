import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFrogData } from '../hooks/useFrogData';
import FriendsList from '../components/frog/FriendsList';
import FriendRequests from '../components/frog/FriendRequests';
import FriendInteractionModal from '../components/frog/FriendInteraction';
import AddFriend from '../components/frog/AddFriend';
import { Frog } from '../types';

export const Friends: React.FC = () => {
  const { frogId } = useParams<{ frogId: string }>();
  const { frog, loading } = useFrogData(parseInt(frogId || '0'));
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Frog | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<number | null>(null);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">好友列表</h2>
              <button
                onClick={() => setShowAddFriend(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                添加好友
              </button>
            </div>
            
            <FriendsList
              key={refreshKey}
              frogId={frog.id}
              onInteractionClick={handleInteractionClick}
            />
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
    </div>
  );
};