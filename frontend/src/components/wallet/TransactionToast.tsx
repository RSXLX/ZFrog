import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { TransactionStatus } from '../../hooks/useTransaction';

interface TransactionToastProps {
  status: TransactionStatus;
  hash?: string;
  message?: string;
  onClose?: () => void;
}

export function TransactionToast({ status, hash, message, onClose }: TransactionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setVisible(true);
    }
    
    // 成功后 5 秒自动关闭
    if (status === 'success') {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const configs = {
    pending: {
      icon: '⏳',
      title: '交易发送中',
      description: message || '请在钱包中确认交易...',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
    },
    confirming: {
      icon: '🔄',
      title: '等待确认',
      description: '交易已提交，等待区块确认...',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
    },
    success: {
      icon: '✅',
      title: '交易成功',
      description: message || '交易已确认！',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
    },
    error: {
      icon: '❌',
      title: '交易失败',
      description: message || '交易执行失败，请重试',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    },
    idle: null,
    simulating: null,
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className={`
            ${config.bgColor} ${config.borderColor} border
            rounded-2xl shadow-lg p-4 max-w-sm
          `}>
            <div className="flex items-start gap-3">
              {/* 图标 */}
              <div className="text-2xl">{config.icon}</div>
              
              {/* 内容 */}
              <div className="flex-1">
                <h4 className={`font-semibold ${config.textColor} mb-1`}>
                  {config.title}
                </h4>
                <p className={`text-sm ${config.textColor} opacity-80`}>
                  {config.description}
                </p>
                
                {/* 交易哈希 */}
                {hash && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-xs bg-white/50 px-2 py-1 rounded">
                      {hash.slice(0, 10)}...{hash.slice(-8)}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(hash)}
                      className="text-xs opacity-60 hover:opacity-100"
                    >
                      复制
                    </button>
                  </div>
                )}
              </div>
              
              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                }}
                className={`p-1 rounded-lg hover:bg-black/5 ${config.textColor} opacity-60 hover:opacity-100`}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {/* 进度条 */}
            {(status === 'pending' || status === 'confirming') && (
              <div className="mt-3">
                <div className="w-full bg-black/10 rounded-full h-1">
                  <motion.div
                    className="bg-current h-1 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: status === 'pending' ? "60%" : "90%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}