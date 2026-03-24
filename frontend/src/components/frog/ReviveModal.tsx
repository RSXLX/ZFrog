/**
 * 🌙 ReviveModal - 唤醒弹窗组件
 * 
 * 功能:
 * - 显示唤醒费用（含祈福折扣）
 * - 支付确认
 * - 祈福好友列表
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lifeFeatureApi } from '../../features/life/api';

interface ReviveModalProps {
  isOpen: boolean;
  onClose: () => void;
  frogId: number;
  frogName: string;
  ownerAddress: string;
  onSuccess?: () => void;
}

export const ReviveModal: React.FC<ReviveModalProps> = ({
  isOpen,
  onClose,
  frogId,
  frogName,
  ownerAddress,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [costInfo, setCostInfo] = useState<{
    baseCost: number;
    discount: number;
    finalCost: number;
    blessings: number;
  } | null>(null);
  const [reviving, setReviving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 加载唤醒费用
  useEffect(() => {
    if (isOpen && frogId) {
      setLoading(true);
      setError(null);
      lifeFeatureApi.getLegacyRevivalCost(frogId)
        .then(setCostInfo)
        .catch((err) => setError(err.message || '获取费用失败'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, frogId]);
  
  // 处理唤醒
  const handleRevive = async () => {
    setReviving(true);
    setError(null);
    try {
      const result = await lifeFeatureApi.reviveLegacy(frogId);
      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || '唤醒失败');
    } finally {
      setReviving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🌙</div>
            <h2 className="text-xl font-bold text-gray-800">唤醒 {frogName}</h2>
            <p className="text-gray-500 text-sm mt-1">
              你的青蛙进入了沉睡状态，需要支付 $LILY 唤醒
            </p>
          </div>
          
          {/* 费用信息 */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : costInfo ? (
            <div className="bg-purple-50 rounded-2xl p-4 mb-6">
              {/* 基础费用 */}
              <div className="flex justify-between items-center text-gray-600 mb-2">
                <span>基础费用</span>
                <span>{costInfo.baseCost} $LILY</span>
              </div>
              
              {/* 祈福折扣 */}
              {costInfo.discount > 0 && (
                <div className="flex justify-between items-center text-green-600 mb-2">
                  <span>
                    🙏 祈福折扣 ({costInfo.blessings} 次祈福)
                  </span>
                  <span>-{Math.round(costInfo.discount)}%</span>
                </div>
              )}
              
              {/* 分隔线 */}
              <div className="border-t border-purple-200 my-3" />
              
              {/* 最终费用 */}
              <div className="flex justify-between items-center text-lg font-bold text-purple-700">
                <span>最终费用</span>
                <span className="flex items-center gap-1">
                  <span className="text-xl">🪷</span>
                  {costInfo.finalCost}
                </span>
              </div>
            </div>
          ) : null}
          
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600
                         hover:bg-gray-50 transition-colors"
              onClick={onClose}
              disabled={reviving}
            >
              稍后再说
            </button>
            <button
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500
                         text-white font-medium shadow-lg shadow-purple-500/30
                         hover:shadow-xl hover:shadow-purple-500/40 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRevive}
              disabled={reviving || loading || !costInfo}
            >
              {reviving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  唤醒中...
                </span>
              ) : (
                '确认唤醒'
              )}
            </button>
          </div>
          
          {/* 祈福提示 */}
          <p className="text-center text-gray-400 text-xs mt-4">
            💡 邀请好友为你祈福可以减少唤醒费用
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviveModal;
