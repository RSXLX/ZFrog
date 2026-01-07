import React from 'react';
import { motion } from 'framer-motion';

interface GardenTabsProps {
  activeTab: 'messages' | 'gifts' | 'photos' | 'achievements' | null;
  onTabChange: (tab: 'messages' | 'gifts' | 'photos' | 'achievements') => void;
  messageCount?: number;
  giftCount?: number;
  photoCount?: number;
}

const tabs = [
  { id: 'messages', label: '留言板', emoji: '📬' },
  { id: 'gifts', label: '礼物盒', emoji: '🎁' },
  { id: 'photos', label: '相册', emoji: '📸' },
  { id: 'achievements', label: '成就', emoji: '🏆' },
] as const;

export const GardenTabs: React.FC<GardenTabsProps> = ({
  activeTab,
  onTabChange,
  messageCount = 0,
  giftCount = 0,
  photoCount = 0
}) => {
  const getCount = (tabId: string) => {
    switch (tabId) {
      case 'messages': return messageCount;
      case 'gifts': return giftCount;
      case 'photos': return photoCount;
      default: return 0;
    }
  };

  return (
    <div className="bg-white border-t">
      <div className="flex">
        {tabs.map((tab) => {
          const count = getCount(tab.id);
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 relative flex flex-col items-center gap-1 transition-colors ${
                isActive
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg relative">
                {tab.emoji}
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className="text-xs">{tab.label}</span>
              
              {/* 活动指示器 */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
