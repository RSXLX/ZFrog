import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../hooks/useWallet';
import { WalletModal } from './WalletModal';

interface ConnectButtonProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectButton({ className = '', showBalance = true }: ConnectButtonProps) {
  const {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    isCorrectChain,
    balance,
    balanceSymbol,
    session,
    connect,
    disconnect,
    switchToZetaChain,
    isModalOpen,
    setIsModalOpen,
  } = useWallet();

  // 未连接状态
  if (!isConnected) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={connect}
          disabled={isConnecting}
          className={`
            relative overflow-hidden
            bg-gradient-to-r from-green-500 to-emerald-600
            hover:from-green-600 hover:to-emerald-700
            text-white font-semibold
            py-3 px-6 rounded-2xl
            shadow-lg shadow-green-500/25
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
        >
          <AnimatePresence mode="wait">
            {isConnecting ? (
              <motion.span
                key="connecting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                <LoadingSpinner size={18} />
                连接中...
              </motion.span>
            ) : (
              <motion.span
                key="connect"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                <WalletIcon size={18} />
                连接钱包
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* 桌面端钱包选择弹窗 */}
        <WalletModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  // 错误链状态
  if (!isCorrectChain) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={switchToZetaChain}
        className={`
          bg-gradient-to-r from-orange-500 to-amber-600
          hover:from-orange-600 hover:to-amber-700
          text-white font-semibold
          py-3 px-6 rounded-2xl
          shadow-lg shadow-orange-500/25
          transition-all duration-200
          ${className}
        `}
      >
        <span className="flex items-center gap-2">
          <AlertIcon size={18} />
          切换到 ZetaChain
        </span>
      </motion.button>
    );
  }

  // 已连接状态
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          flex items-center gap-3
          bg-white/80 backdrop-blur-sm
          border border-gray-200
          rounded-2xl px-4 py-2
          shadow-sm
          ${className}
        `}
      >
        {/* 连接状态指示 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
          </div>
          
          {/* 钱包图标 */}
          {session?.metadata?.icon && (
            <img 
              src={session.metadata.icon} 
              alt={session.metadata.name} 
              className="w-5 h-5 rounded"
            />
          )}
        </div>
        
        {/* 地址和余额 */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800">
            {shortAddress}
          </span>
          {showBalance && (
            <span className="text-xs text-gray-500">
              {parseFloat(balance).toFixed(4)} {balanceSymbol}
            </span>
          )}
        </div>
        
        {/* 断开按钮 */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={disconnect}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="断开连接"
        >
          <DisconnectIcon size={16} className="text-gray-400 hover:text-gray-600" />
        </motion.button>
      </motion.div>

      {/* 桌面端钱包选择弹窗 */}
      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

// 图标组件
function WalletIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M16 12h5" />
      <circle cx="18" cy="12" r="1" />
    </svg>
  );
}

function AlertIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DisconnectIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle 
        cx="12" cy="12" r="10" 
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
      />
    </svg>
  );
}