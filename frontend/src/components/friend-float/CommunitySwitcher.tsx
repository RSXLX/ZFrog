import React, { useState } from 'react';
import { useCommunityStore, Community, DEFAULT_COMMUNITY } from '../../stores/communityStore';

interface CommunitySwitcherProps {
  onJoinCommunity: () => void;
}

export const CommunitySwitcher: React.FC<CommunitySwitcherProps> = ({ onJoinCommunity }) => {
  const { userCommunities, activeCommunity, setActiveCommunity } = useCommunityStore();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = (community: Community) => {
    setActiveCommunity(community);
    setIsOpen(false);
  };
  
  // 构建社区列表（默认社区 + 用户加入的社区）
  const allCommunities: Community[] = [
    DEFAULT_COMMUNITY,
    ...userCommunities.map(uc => uc.community),
  ];
  
  return (
    <div className="community-switcher">
      <button 
        className="community-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{activeCommunity?.icon || '🏠'}</span>
        <span>{activeCommunity?.name || 'ZetaFrog Official'}</span>
        <span style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}>▼</span>
      </button>
      
      {isOpen && (
        <>
          {/* 点击外部关闭 */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 5,
            }}
            onClick={() => setIsOpen(false)}
          />
          
          <div className="community-dropdown">
            {allCommunities.map((community) => (
              <div
                key={community.id}
                className={`community-dropdown-item ${activeCommunity?.id === community.id ? 'active' : ''}`}
                onClick={() => handleSelect(community)}
              >
                <span className="icon">{community.icon}</span>
                <span className="name">{community.name}</span>
                {activeCommunity?.id === community.id && (
                  <span className="check">✓</span>
                )}
              </div>
            ))}
            
            <div className="community-dropdown-divider" />
            
            <div
              className="community-dropdown-item community-dropdown-add"
              onClick={() => {
                setIsOpen(false);
                onJoinCommunity();
              }}
            >
              <span className="icon">＋</span>
              <span className="name">加入新社区</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
