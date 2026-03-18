import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GardenFrogState, getFriendshipLevel } from '../../types/garden';
import { apiService } from '../../services/api';
import { useToast } from '../common/ToastProvider';

interface GardenInteractionPanelProps {
  frogState: GardenFrogState;
  hostFrogId: number;  // Added for API calls
  onClose: () => void;
  onInteractionComplete: () => void;
}

export const GardenInteractionPanel: React.FC<GardenInteractionPanelProps> = ({
  frogState,
  hostFrogId,
  onClose,
  onInteractionComplete
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [friendshipXp, setFriendshipXp] = useState(0);
  const [friendshipLoading, setFriendshipLoading] = useState(true);

  const friendshipLevel = getFriendshipLevel(friendshipXp);
  const progressPercent =
    friendshipLevel.maxXp === Infinity
      ? 100
      : ((friendshipXp - friendshipLevel.minXp) / (friendshipLevel.maxXp - friendshipLevel.minXp)) * 100;

  useEffect(() => {
    let cancelled = false;

    const loadFriendship = async () => {
      setFriendshipLoading(true);
      try {
        const response = await apiService.get<{ success: boolean; data: any[] }>(`/friends/list/${hostFrogId}`);
        const list = response?.data || [];
        const matched = list.find((item) => item.tokenId === frogState.frog.tokenId);
        if (!cancelled) {
          setFriendshipXp(Math.max(0, Number(matched?.intimacy || 0)));
        }
      } catch (error) {
        if (!cancelled) {
          setFriendshipXp(0);
        }
      } finally {
        if (!cancelled) {
          setFriendshipLoading(false);
        }
      }
    };

    void loadFriendship();
    return () => {
      cancelled = true;
    };
  }, [hostFrogId, frogState.frog.tokenId]);

  // 计算做客时长
  const getVisitDuration = () => {
    if (!frogState.visitStartedAt) return 0;
    const start = new Date(frogState.visitStartedAt);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  };

  // 处理点赞
  const handleLike = async () => {
    setIsLoading(true);
    setShowHeartAnimation(true);
    
    try {
      await apiService.post(`/garden/${hostFrogId}/interact`, {
        targetFrogId: frogState.frog.tokenId,
        type: 'like'
      });
      toast.success('❤️ 点赞成功');
      setFriendshipXp(prev => prev + 5);
    } catch (error) {
      console.error('Like failed:', error);
      toast.error('点赞失败');
    }
    
    setIsLoading(false);
    setTimeout(() => setShowHeartAnimation(false), 1000);
  };

  // 处理喂食
  const handleFeed = async () => {
    setIsLoading(true);
    try {
      await apiService.post(`/garden/${hostFrogId}/interact`, {
        targetFrogId: frogState.frog.tokenId,
        type: 'feed',
        data: { foodType: 'apple' }
      });
      toast.success('🍎 喂食成功');
      setFriendshipXp(prev => prev + 10);
    } catch (error) {
      console.error('Feed failed:', error);
      toast.error('喂食失败');
    }
    setIsLoading(false);
  };

  // 处理送礼
  const handleGift = async () => {
    setIsLoading(true);
    try {
      await apiService.post(`/garden/${hostFrogId}/interact`, {
        targetFrogId: frogState.frog.tokenId,
        type: 'gift',
        data: { giftType: 'flower' }
      });
      toast.success('🎁 送礼成功');
      setFriendshipXp(prev => prev + 30);
    } catch (error) {
      console.error('Gift failed:', error);
      toast.error('送礼失败');
    }
    setIsLoading(false);
  };

  // 处理合影
  const handlePhoto = async () => {
    setIsLoading(true);
    try {
      await apiService.post(`/garden/${hostFrogId}/interact`, {
        targetFrogId: frogState.frog.tokenId,
        type: 'photo'
      });
      toast.success('📸 合影成功');
      setFriendshipXp(prev => prev + 15);
    } catch (error) {
      console.error('Photo failed:', error);
      toast.error('合影失败');
    }
    setIsLoading(false);
  };

  // 处理留言
  const handleMessage = async () => {
    const message = window.prompt('输入留言内容:');
    if (!message) return;
    
    setIsLoading(true);
    try {
      await apiService.post(`/garden/${hostFrogId}/messages`, {
        authorFrogId: hostFrogId,
        content: message
      });
      toast.success('💬 留言成功');
      setFriendshipXp(prev => prev + 5);
    } catch (error) {
      console.error('Message failed:', error);
      toast.error('留言失败');
    }
    setIsLoading(false);
  };

  // 处理送客
  const handleSendOff = async () => {
    if (window.confirm(`确定让 ${frogState.frog.name} 现在离开吗？`)) {
      setIsLoading(true);
      try {
        await apiService.post(`/garden/${hostFrogId}/leave`, {
          guestFrogId: frogState.frog.tokenId
        });
        toast.success('访客已离开');
        onInteractionComplete();
      } catch (error) {
        console.error('Send off failed:', error);
        toast.error('送客失败');
      }
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部：青蛙信息 */}
        <div className="p-4 bg-gradient-to-r from-green-100 to-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-inner">
              🐸
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">
                {frogState.frog.name}
              </h3>
              <p className="text-sm text-gray-600">
                已做客：{getVisitDuration()} 分钟
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span>状态：</span>
                <span className="text-green-600">正在闲逛 🚶</span>
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 互动按钮 */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <InteractionButton
              emoji="❤️"
              label="点赞"
              onClick={handleLike}
              disabled={isLoading}
              showAnimation={showHeartAnimation}
            />
            <InteractionButton
              emoji="🍎"
              label="喂食"
              onClick={handleFeed}
              disabled={isLoading}
            />
            <InteractionButton
              emoji="🎁"
              label="送礼"
              onClick={handleGift}
              disabled={isLoading}
            />
            <InteractionButton
              emoji="📸"
              label="合影"
              onClick={handlePhoto}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InteractionButton
              emoji="💬"
              label="留言"
              onClick={handleMessage}
              disabled={isLoading}
              fullWidth
            />
            <InteractionButton
              emoji="👋"
              label="送客"
              onClick={handleSendOff}
              disabled={isLoading}
              fullWidth
              variant="secondary"
            />
          </div>
        </div>

        {/* 友好度 */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">💕 友好度</span>
              <span className="text-sm font-medium">
                Lv.{friendshipLevel.level} {friendshipLevel.name}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-400 to-pink-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {friendshipLoading ? '加载中...' : `${friendshipXp}/${friendshipLevel.maxXp === Infinity ? '∞' : friendshipLevel.maxXp}`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 爱心飘落动画 */}
      {showHeartAnimation && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
                opacity: 1,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{ 
                y: -100,
                opacity: 0,
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: 1.5 + Math.random(),
                delay: i * 0.1
              }}
              className="absolute text-2xl"
            >
              ❤️
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// 互动按钮子组件
interface InteractionButtonProps {
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  showAnimation?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
}

const InteractionButton: React.FC<InteractionButtonProps> = ({
  emoji,
  label,
  onClick,
  disabled = false,
  showAnimation = false,
  fullWidth = false,
  variant = 'primary'
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${variant === 'primary' 
          ? 'bg-gray-100 hover:bg-gray-200' 
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
        }
        ${fullWidth ? '' : 'aspect-square'}
      `}
    >
      <span className={`text-xl relative ${showAnimation ? 'animate-bounce' : ''}`}>
        {emoji}
        {showAnimation && (
          <motion.span
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 text-xl"
          >
            {emoji}
          </motion.span>
        )}
      </span>
      <span className="text-xs text-gray-600">{label}</span>
    </motion.button>
  );
};
