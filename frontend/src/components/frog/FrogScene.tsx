import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FrogPet } from './FrogPet';
import { Frog } from '../../types';
import { FrogState } from '../../types/frogAnimation';
import { apiService } from '../../services/api';

interface FrogSceneProps {
  /** 主青蛙 tokenId (NFT ID) */
  frogId: number;
  /** 主青蛙名称 */
  frogName: string;
  /** 是否显示访客控制按钮 */
  showVisitorControls?: boolean;
  /** 结伴旅行回调 */
  onGroupTravel?: (companion: Frog) => void;
  /** 是否当前用户拥有这只青蛙 */
  isOwner?: boolean;
}

/**
 * 青蛙场景组件
 * 
 * 包装 FrogPet，添加访客青蛙显示和互动功能
 * - 主青蛙和访客青蛙左右并排显示
 * - 用户手动邀请访客
 * - 最多 1 只访客
 */
export const FrogScene: React.FC<FrogSceneProps> = ({
  frogId,
  frogName,
  showVisitorControls = true,
  onGroupTravel,
  isOwner = false,
}) => {
  // 访客青蛙状态
  const [visitorFrog, setVisitorFrog] = useState<Frog | null>(null);
  
  // 好友列表弹窗
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendsList, setFriendsList] = useState<Frog[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // 加载好友列表
  const loadFriends = useCallback(async () => {
    if (!frogId) return;
    setIsLoadingFriends(true);
    try {
      const response = await apiService.get(`/friends/list/${frogId}`);
      if (response.success) {
        setFriendsList(response.data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [frogId]);

  // 邀请好友
  const handleInviteFriend = useCallback((friend: Frog) => {
    setVisitorFrog(friend);
    setShowFriendPicker(false);
  }, []);

  // 让访客离开
  const handleDismissVisitor = useCallback(() => {
    setVisitorFrog(null);
  }, []);

  // 发起结伴旅行
  const handleGroupTravel = useCallback(() => {
    if (visitorFrog && onGroupTravel) {
      onGroupTravel(visitorFrog);
    }
  }, [visitorFrog, onGroupTravel]);

  return (
    <div className="relative">
      {/* 青蛙容器 - 左右并排 */}
      <div className="flex items-end justify-center gap-4">
        {/* 主青蛙 */}
        <motion.div
          layout
          className="relative"
        >
          <FrogPet
            frogId={frogId}
            name={frogName}
            initialState={FrogState.IDLE}
          />
          <p className="text-center text-sm text-gray-600 mt-1">{frogName}</p>
        </motion.div>

        {/* 访客青蛙 */}
        <AnimatePresence>
          {visitorFrog && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 0.85 }}
              exit={{ opacity: 0, x: 50, scale: 0.8 }}
              className="relative"
            >
              {/* 访客标签 */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                访客
              </div>
              
              {/* 缩小版 FrogPet */}
              <div className="transform scale-75 origin-bottom">
                <FrogPet
                  frogId={visitorFrog.tokenId}
                  name={visitorFrog.name}
                  initialState={FrogState.IDLE}
                />
              </div>
              
              <p className="text-center text-sm text-purple-600 -mt-2">{visitorFrog.name}</p>
              
              {/* 关闭按钮 */}
              <button
                onClick={handleDismissVisitor}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 z-20"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 控制按钮 */}
      {showVisitorControls && isOwner && (
        <div className="flex justify-center gap-2 mt-4">
          {!visitorFrog ? (
            <button
              onClick={() => { loadFriends(); setShowFriendPicker(true); }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 text-sm"
            >
              👋 邀请好友来玩
            </button>
          ) : (
            <>
              <button
                onClick={handleGroupTravel}
                disabled={!onGroupTravel}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm disabled:opacity-50"
              >
                🚀 一起去旅行
              </button>
              <button
                onClick={handleDismissVisitor}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
              >
                送走访客
              </button>
            </>
          )}
        </div>
      )}

      {/* 好友选择弹窗 */}
      <AnimatePresence>
        {showFriendPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowFriendPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-80 max-h-[60vh] overflow-y-auto shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">👋 选择好友</h3>
              
              {isLoadingFriends ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">加载中...</p>
                </div>
              ) : friendsList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  还没有好友，快去添加一些吧！
                </p>
              ) : (
                <div className="space-y-2">
                  {friendsList.map((friend: any) => (
                    <button
                      key={friend.id}
                      onClick={() => handleInviteFriend(friend)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="text-left">
                        <p className="font-semibold">{friend.name}</p>
                        <p className="text-xs text-gray-500">
                          Lv.{friend.level} · {friend.status === 'Idle' ? '空闲' : '旅行中'}
                        </p>
                      </div>
                      <span className="text-green-500">→</span>
                    </button>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setShowFriendPicker(false)}
                className="w-full mt-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FrogScene;
