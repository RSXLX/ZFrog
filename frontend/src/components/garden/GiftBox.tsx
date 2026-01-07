/**
 * GiftBox - 礼物盒组件
 * 
 * 功能:
 * - 显示收到的礼物
 * - 拆礼物动画
 * - 礼物历史
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

export interface Gift {
  id: string;
  fromAddress: string;
  giftType: 'ITEM' | 'NFT' | 'TOKEN' | 'DECORATION';
  itemName: string;
  itemImageUrl?: string;
  quantity: number;
  message?: string;
  isOpened: boolean;
  createdAt: string;
  openedAt?: string;
}

interface GiftBoxProps {
  frogId: number;
  isOwner: boolean;
  onClose: () => void;
}

export const GiftBox: React.FC<GiftBoxProps> = ({
  frogId,
  isOwner,
  onClose,
}) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unopened' | 'opened'>('unopened');
  const [openingGift, setOpeningGift] = useState<string | null>(null);
  const [openedGiftResult, setOpenedGiftResult] = useState<Gift | null>(null);

  // 加载礼物
  useEffect(() => {
    loadGifts();
  }, [frogId]);

  const loadGifts = async () => {
    try {
      const response = await apiService.get(`/homestead/${frogId}/gifts`);
      if (response.success) {
        setGifts(response.data?.gifts || []);
      }
    } catch (error) {
      console.error('Failed to load gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开礼物
  const handleOpenGift = async (giftId: string) => {
    if (!isOwner) return;
    
    setOpeningGift(giftId);
    
    // 播放开启动画
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const response = await apiService.post(`/homestead/${frogId}/gifts/${giftId}/open`);
      
      if (response.success) {
        setOpenedGiftResult(response.data);
        setGifts(prevGifts =>
          prevGifts.map(g =>
            g.id === giftId ? { ...g, isOpened: true, openedAt: new Date().toISOString() } : g
          )
        );
      }
    } catch (error) {
      console.error('Failed to open gift:', error);
    } finally {
      setOpeningGift(null);
    }
  };

  // 关闭结果弹窗
  const closeResult = () => {
    setOpenedGiftResult(null);
  };

  // 过滤礼物
  const filteredGifts = gifts.filter(g =>
    activeTab === 'unopened' ? !g.isOpened : g.isOpened
  );

  // 未开封数量
  const unopenedCount = gifts.filter(g => !g.isOpened).length;

  // 格式化地址
  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  // 礼物类型图标
  const getGiftTypeIcon = (type: string) => {
    switch (type) {
      case 'NFT': return '🖼️';
      case 'TOKEN': return '💰';
      case 'DECORATION': return '🪴';
      default: return '🎁';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md 
                   max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b 
                        dark:border-gray-700 bg-gradient-to-r from-pink-400 to-rose-400">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🎁 礼物盒
            {unopenedCount > 0 && (
              <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-sm">
                {unopenedCount} 个未拆
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('unopened')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'unopened'
                ? 'text-pink-500 border-b-2 border-pink-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            未拆开 {unopenedCount > 0 && `(${unopenedCount})`}
          </button>
          <button
            onClick={() => setActiveTab('opened')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'opened'
                ? 'text-pink-500 border-b-2 border-pink-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            已拆开
          </button>
        </div>

        {/* 礼物列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : filteredGifts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📭</div>
              <p>{activeTab === 'unopened' ? '没有新礼物' : '还没有已拆的礼物'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredGifts.map((gift) => (
                <motion.div
                  key={gift.id}
                  className={`relative bg-gradient-to-br rounded-xl p-3 cursor-pointer
                             transition-all hover:shadow-lg ${
                               gift.isOpened
                                 ? 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'
                                 : 'from-pink-100 to-rose-200 dark:from-pink-900 dark:to-rose-800'
                             }`}
                  onClick={() => !gift.isOpened && isOwner && handleOpenGift(gift.id)}
                  whileHover={{ scale: gift.isOpened ? 1 : 1.03 }}
                  whileTap={{ scale: gift.isOpened ? 1 : 0.97 }}
                >
                  {/* 礼物图标/图片 */}
                  <div className="aspect-square bg-white/50 dark:bg-black/20 rounded-lg 
                                  flex items-center justify-center mb-2">
                    {openingGift === gift.id ? (
                      <motion.div
                        animate={{ 
                          rotate: [0, -10, 10, -10, 0],
                          scale: [1, 1.1, 1.1, 1.1, 1.3]
                        }}
                        transition={{ duration: 1.5 }}
                        className="text-4xl"
                      >
                        🎁
                      </motion.div>
                    ) : gift.itemImageUrl ? (
                      <img
                        src={gift.itemImageUrl}
                        alt={gift.itemName}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <span className="text-4xl">
                        {gift.isOpened ? getGiftTypeIcon(gift.giftType) : '🎁'}
                      </span>
                    )}
                  </div>
                  
                  {/* 礼物信息 */}
                  <div className="text-center">
                    <p className="font-medium text-sm truncate">
                      {gift.isOpened ? gift.itemName : '神秘礼物'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      来自 {formatAddress(gift.fromAddress)}
                    </p>
                  </div>
                  
                  {/* 未拆标记 */}
                  {!gift.isOpened && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white 
                                    text-xs px-2 py-0.5 rounded-full">
                      NEW
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 开启结果弹窗 */}
      <AnimatePresence>
        {openedGiftResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-60"
            onClick={closeResult}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center 
                            shadow-2xl max-w-xs" onClick={e => e.stopPropagation()}>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-6xl mb-4"
              >
                🎊
              </motion.div>
              <h3 className="text-xl font-bold mb-2">恭喜获得！</h3>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <span className="text-3xl block mb-2">
                  {getGiftTypeIcon(openedGiftResult.giftType)}
                </span>
                <p className="font-semibold">{openedGiftResult.itemName}</p>
                {openedGiftResult.quantity > 1 && (
                  <p className="text-sm text-gray-500">x{openedGiftResult.quantity}</p>
                )}
              </div>
              {openedGiftResult.message && (
                <p className="text-sm text-gray-500 italic mb-4">
                  "{openedGiftResult.message}"
                </p>
              )}
              <button
                onClick={closeResult}
                className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white 
                           rounded-full font-medium"
              >
                太棒了！
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GiftBox;
