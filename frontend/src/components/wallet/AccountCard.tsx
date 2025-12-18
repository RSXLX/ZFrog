import { motion } from 'framer-motion';
import { useWallet } from '../../hooks/useWallet';
import { formatSessionAge } from '../../services/wallet/sessionStore';

export function AccountCard() {
  const {
    address,
    shortAddress,
    isConnected,
    balance,
    balanceSymbol,
    session,
    disconnect,
  } = useWallet();

  if (!isConnected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-xl p-6 max-w-sm"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🐸</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">ZetaFrog 钱包</h3>
            <p className="text-xs text-gray-500">
              {session ? formatSessionAge(Date.now() - session.connectedAt) : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-green-600 font-medium">已连接</span>
        </div>
      </div>
      
      {/* 地址 */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">钱包地址</p>
        <div className="flex items-center justify-between">
          <code className="text-sm font-mono text-gray-800">{shortAddress}</code>
          <button
            onClick={() => navigator.clipboard.writeText(address || '')}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            复制
          </button>
        </div>
      </div>
      
      {/* 余额 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
        <p className="text-xs text-gray-500 mb-1">余额</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-800">
            {parseFloat(balance).toFixed(4)}
          </span>
          <span className="text-sm text-gray-500">{balanceSymbol}</span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://athens.explorer.zetachain.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
        >
          <ExplorerIcon size={16} />
          查看详情
        </a>
        <button
          onClick={disconnect}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 transition-colors"
        >
          <LogoutIcon size={16} />
          断开连接
        </button>
      </div>
    </motion.div>
  );
}

function ExplorerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoutIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}