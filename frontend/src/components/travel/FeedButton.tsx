// frontend/src/components/travel/FeedButton.tsx
// V2.0 投喂按钮组件

import React, { useState } from 'react';
import { travelFeatureApi } from '../../features/travel/api';
import './FeedButton.css';

interface FeedButtonProps {
  travelId: number;
  feederId: number;
  targetFrogName: string;
  onFeedSuccess?: (result: { timeReduced: number; triggeredLuckyBuff?: boolean }) => void;
  disabled?: boolean;
}

const SNACK_OPTIONS = [
  { type: 'energy', emoji: '⚡', name: '能量零食', cost: 10 },
  { type: 'worm', emoji: '🐛', name: '虫子零食', cost: 15 },
  { type: 'candy', emoji: '🍬', name: '以太糖果', cost: 15 },
  { type: 'seed', emoji: '🌱', name: '链上种子', cost: 15 },
  { type: 'berry', emoji: '🫐', name: '紫晶浆果', cost: 15 },
  { type: 'boost', emoji: '🚀', name: '加速能量', cost: 25 },
];

export const FeedButton: React.FC<FeedButtonProps> = ({
  travelId,
  feederId,
  targetFrogName,
  onFeedSuccess,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFeed = async (feedType: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await travelFeatureApi.feedTravel(travelId, feederId, feedType);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.triggeredLuckyBuff
            ? `🍀 触发幸运 Buff！减少了 ${result.timeReduced} 秒！`
            : `投喂成功！减少了 ${result.timeReduced} 秒`,
        });
        onFeedSuccess?.({ timeReduced: result.timeReduced, triggeredLuckyBuff: result.triggeredLuckyBuff });
      } else {
        setMessage({ type: 'error', text: result.error || '投喂失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '投喂失败' });
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="feed-button-container">
      <button
        className="feed-button-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
      >
        {isLoading ? '🔄' : '🍭'} 投喂 {targetFrogName}
      </button>

      {isOpen && (
        <div className="feed-menu">
          <div className="feed-menu-header">选择要投喂的零食</div>
          <div className="feed-menu-items">
            {SNACK_OPTIONS.map((snack) => (
              <button
                key={snack.type}
                className="feed-menu-item"
                onClick={() => handleFeed(snack.type)}
                disabled={isLoading}
              >
                <span className="feed-emoji">{snack.emoji}</span>
                <span className="feed-name">{snack.name}</span>
                <span className="feed-cost">{snack.cost}pts</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`feed-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
};

export default FeedButton;
