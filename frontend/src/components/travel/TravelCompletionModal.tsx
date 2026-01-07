/**
 * TravelCompletionModal - 旅行完成庆祝弹窗
 * 
 * 在跨链旅行完成时自动弹出，展示：
 * - 撒花动画
 * - XP 获得摘要
 * - 干粮退还金额
 * - 纪念品预览
 * - 操作按钮
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

// 简单的窗口尺寸 hook
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export interface CompletionData {
  frogName: string;
  xpEarned: number;
  refundAmount?: string; // wei
  refundFormatted?: string; // "0.004 ZETA"
  souvenir?: {
    name: string;
    emoji?: string;
    rarity: number;
    imageUrl?: string;
  };
  discoveries?: Array<{
    title: string;
    rarity: number;
  }>;
  travelId: number;
  targetChain: string;
  duration: number; // seconds
}

interface TravelCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CompletionData | null;
  onViewDetails?: () => void;
  onStartNewTravel?: () => void;
}

export function TravelCompletionModal({
  isOpen,
  onClose,
  data,
  onViewDetails,
  onStartNewTravel,
}: TravelCompletionModalProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // 5秒后停止撒花
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!data) return null;

  // 格式化退款金额
  const formatRefund = (wei?: string) => {
    if (!wei) return null;
    const zeta = Number(wei) / 1e18;
    return zeta.toFixed(4);
  };

  const refundZeta = data.refundFormatted || (data.refundAmount ? `${formatRefund(data.refundAmount)} ZETA` : null);

  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`;
    return `${Math.floor(seconds / 3600)} 小时`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 撒花动画 */}
          {showConfetti && (
            <Confetti
              width={width}
              height={height}
              recycle={false}
              numberOfPieces={200}
              gravity={0.1}
              colors={['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']}
            />
          )}

          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* 弹窗主体 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* 头部 - 庆祝区域 */}
              <div className="bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 p-6 text-center text-white relative overflow-hidden">
                {/* 装饰圆圈 */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl mb-2"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold mb-1">
                  {data.frogName} 回来啦！
                </h2>
                <p className="text-white/80 text-sm">
                  {data.targetChain} · {formatDuration(data.duration)}
                </p>
              </div>

              {/* 内容区域 */}
              <div className="p-6 space-y-4">
                {/* 统计摘要 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* XP 获得 */}
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      +{data.xpEarned}
                    </div>
                    <div className="text-sm text-purple-500">XP 获得</div>
                  </div>

                  {/* 干粮退还 */}
                  {refundZeta && (
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-lg font-bold text-green-600 truncate">
                        +{refundZeta}
                      </div>
                      <div className="text-sm text-green-500">干粮退还</div>
                    </div>
                  )}

                  {/* 如果没有退款，显示发现数量 */}
                  {!refundZeta && data.discoveries && (
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {data.discoveries.length}
                      </div>
                      <div className="text-sm text-blue-500">链上发现</div>
                    </div>
                  )}
                </div>

                {/* 纪念品预览 */}
                {data.souvenir && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 flex items-center gap-4 border border-yellow-200"
                  >
                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-3xl shadow-inner border border-yellow-100 overflow-hidden">
                      {data.souvenir.imageUrl ? (
                        <img 
                          src={data.souvenir.imageUrl} 
                          alt={data.souvenir.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        data.souvenir.emoji || '🎁'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-yellow-600 font-medium">获得纪念品</div>
                      <div className="font-bold text-gray-800 truncate">{data.souvenir.name}</div>
                      <div className="text-xs text-gray-500">
                        {'⭐'.repeat(data.souvenir.rarity)}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onViewDetails}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📖</span>
                    <span>查看详情</span>
                  </button>
                  <button
                    onClick={onStartNewTravel}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                  >
                    <span>🎒</span>
                    <span>再次出发</span>
                  </button>
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TravelCompletionModal;
