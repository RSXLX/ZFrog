/**
 * 🙏 BlessButton - 祈福按钮组件
 * 
 * 功能:
 * - 为好友的沉睡青蛙祈福
 * - 显示祈福动画
 * - 消耗活力值
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { hibernationApi } from '../../services/hibernation.api';

interface BlessButtonProps {
  targetFrogId: number;
  currentUserFrogId: number;
  targetFrogName: string;
  onSuccess?: () => void;
}

export const BlessButton: React.FC<BlessButtonProps> = ({
  targetFrogId,
  currentUserFrogId,
  targetFrogName,
  onSuccess,
}) => {
  const [blessing, setBlessing] = useState(false);
  const [blessed, setBlessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleBless = async () => {
    if (blessing || blessed) return;
    
    setBlessing(true);
    setError(null);
    
    try {
      const result = await hibernationApi.blessFrog(currentUserFrogId, targetFrogId);
      if (result.success) {
        setBlessed(true);
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || '祈福失败');
    } finally {
      setBlessing(false);
    }
  };
  
  if (blessed) {
    return (
      <motion.div
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                   bg-green-100 text-green-700 text-sm font-medium"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <span>✨</span>
        <span>已祈福</span>
      </motion.div>
    );
  }
  
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        className={`
          inline-flex items-center gap-1.5 px-4 py-2 rounded-full
          bg-gradient-to-r from-amber-400 to-orange-400
          text-white text-sm font-medium shadow-lg shadow-amber-500/30
          hover:shadow-xl hover:shadow-amber-500/40 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        onClick={handleBless}
        disabled={blessing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {blessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>祈福中...</span>
          </>
        ) : (
          <>
            <span>🙏</span>
            <span>为 {targetFrogName} 祈福</span>
          </>
        )}
      </motion.button>
      
      {error && (
        <span className="text-red-500 text-xs">{error}</span>
      )}
      
      <span className="text-gray-400 text-xs">消耗 10 活力值</span>
    </div>
  );
};

export default BlessButton;
