import React from 'react';
import { useFriendFloatStore } from '../../stores/friendFloatStore';

interface FriendFloatTabsProps {
  activeTab: 'friends' | 'requests' | 'online';
  onTabChange: (tab: 'friends' | 'requests' | 'online') => void;
}

export const FriendFloatTabs: React.FC<FriendFloatTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { pendingRequestCount } = useFriendFloatStore();
  
  const tabs = [
    { id: 'friends' as const, label: '好友', badge: 0 },
    { id: 'requests' as const, label: '请求', badge: pendingRequestCount },
    { id: 'online' as const, label: '在线', badge: 0 },
  ];
  
  return (
    <div className="float-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`float-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.badge > 0 && (
            <span className="float-tab-badge">
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
