import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyFrog } from '../hooks/useMyFrog';
import FriendsList from '../components/frog/FriendsList';
import FriendRequests from '../components/frog/FriendRequests';
import FriendInteractionModal from '../components/frog/FriendInteraction';
import AddFriend from '../components/frog/AddFriend';
import AddFriendByWallet from '../components/frog/AddFriendByWallet';
import WorldOnlineList from '../components/frog/WorldOnlineList';
import { Frog } from '../types';
import '../styles/friend-system.css';

export const Friends: React.FC = () => {
  // 使用 useMyFrog 自动获取当前用户的唯一青蛙
  const { frog, loading, isConnected, hasFrog } = useMyFrog();
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddFriendByWallet, setShowAddFriendByWallet] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Frog | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'world'>('friends');
  const [refreshKey, setRefreshKey] = useState(0);

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="friend-main-container">
        <div className="friend-empty-state">
          <div className="empty-illustration">🔗</div>
          <h2 className="empty-text">请先连接钱包</h2>
          <p className="empty-subtext">连接钱包后即可使用好友系统</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="friend-main-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  // 没有青蛙
  if (!hasFrog || !frog) {
    return (
      <div className="friend-main-container">
        <div className="friend-empty-state">
          <div className="empty-illustration">🐸</div>
          <h2 className="empty-text">还没有青蛙</h2>
          <p className="empty-subtext">先去铸造一只青蛙才能使用好友系统哦！</p>
          <div className="action-buttons">
            <Link to="/?mint=true" className="friend-btn friend-btn-primary">
              🎉 立即铸造
            </Link>
          </div>
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Idle': return '空闲中';
      case 'Traveling': return '旅行中';
      case 'Returning': return '返回中';
      default: return status;
    }
  };

  return (
    <>
      {/* 顶部统计栏 */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-icon">👑</span> 等级 {frog.level}
        </div>
        <div className="stat-item">
          <span className="stat-icon">💧</span> 蝌蚪值 {frog.xp}
        </div>
        <div className="stat-item">
          <span className="stat-icon">🗺️</span> 旅行 {frog.totalTravels} 次
        </div>
        <div className="stat-item">
          <span className="stat-icon">✈️</span> {getStatusText(frog.status)}
        </div>
      </div>

      {/* 主容器 */}
      <main className="friend-main-container">
        
        {/* 左侧边栏 */}
        <aside className="friend-sidebar">
          {/* 我的青蛙卡片 */}
          <div className="sidebar-card">
            <div className="sidebar-title">
              我的青蛙
              <span style={{ color: '#ccc', cursor: 'pointer' }}>⚙️</span>
            </div>
            <div className="frog-avatar-lg">
              <div className="frog-emoji">🐸</div>
            </div>
            <div className="frog-info-center">
              <h3>{frog.name}</h3>
              <p>Ready to hop!</p>
            </div>
          </div>

          {/* 好友请求卡片 */}
          <div className="sidebar-card">
            <div className="sidebar-title">
              好友请求
              <span className="badge" id="request-badge">0</span>
            </div>
            <FriendRequests
              frogId={frog.tokenId}
              onRequestProcessed={handleRequestProcessed}
            />
          </div>
        </aside>

        {/* 右侧内容面板 */}
        <section className="friend-content-panel">
          {/* 标签页头部 */}
          <div className="friend-tabs-header">
            <button 
              className={`friend-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              好友列表
            </button>
            <button 
              className={`friend-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              好友请求
            </button>
            <button 
              className={`friend-tab-btn ${activeTab === 'world' ? 'active' : ''}`}
              onClick={() => setActiveTab('world')}
            >
              世界在线
            </button>
          </div>

          {/* 标签页内容 */}
          <div className="friend-tab-content">
            {/* 好友列表 */}
            {activeTab === 'friends' && (
              <div className="friend-tab-pane active">
                <FriendsList
                  key={refreshKey}
                  frogId={frog.tokenId}
                  onInteractionClick={handleInteractionClick}
                  onAddFriendClick={() => setShowAddFriendByWallet(true)}
                  onSearchClick={() => setShowAddFriend(true)}
                />
              </div>
            )}

            {/* 好友请求 */}
            {activeTab === 'requests' && (
              <div className="friend-tab-pane active">
                <FriendRequests
                  frogId={frog.tokenId}
                  onRequestProcessed={handleRequestProcessed}
                />
              </div>
            )}

            {/* 世界在线 */}
            {activeTab === 'world' && (
              <div className="friend-tab-pane active">
                <WorldOnlineList
                  currentFrogId={frog.tokenId}
                  onFriendAdded={handleFriendAdded}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 互动弹窗 */}
      {selectedFriend && selectedFriendshipId && (
        <FriendInteractionModal
          friend={selectedFriend}
          friendshipId={selectedFriendshipId}
          currentFrogId={frog.tokenId}
          onClose={handleCloseInteraction}
          onInteractionComplete={handleInteractionComplete}
        />
      )}

      {/* 添加好友弹窗 */}
      {showAddFriend && (
        <AddFriend
          currentFrogId={frog.tokenId}
          onFriendAdded={handleFriendAdded}
          onClose={() => setShowAddFriend(false)}
        />
      )}

      {/* 钱包地址添加好友弹窗 */}
      {showAddFriendByWallet && (
        <AddFriendByWallet
          currentFrogId={frog.tokenId}
          onFriendAdded={handleFriendAdded}
          onClose={() => setShowAddFriendByWallet(false)}
        />
      )}
    </>
  );
};