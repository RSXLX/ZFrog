import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnect } from 'wagmi';
import { QRCodeModal } from './QRCodeModal';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectors, connectAsync } = useConnect();
  const [showQR, setShowQR] = useState(false);
  const [uri, setUri] = useState('');

  const handleConnect = async (connector: any) => {
    if (connector.id === 'walletConnect') {
      try {
        // Listen for URI generation
        const provider = await connector.getProvider();
        provider.on('display_uri', (newUri: string) => {
          setUri(newUri);
          setShowQR(true);
        });

        await connectAsync({ connector });
        onClose();
      } catch (error) {
        console.error('WalletConnect error:', error);
      }
    } else {
      try {
        await connectAsync({ connector });
        onClose();
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-8 shadow-2xl max-w-md w-full relative overflow-hidden"
            >
              {/* Decoration */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
              
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors group"
              >
                <CloseIcon size={20} className="text-gray-400 group-hover:text-gray-600" />
              </button>

              <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">🐸</span>
                <h3 className="text-2xl font-bold text-gray-800">连接 ZetaFrog</h3>
                <p className="text-gray-500 mt-2">选择您想要连接钱包的方式</p>
              </div>

              <div className="grid gap-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => handleConnect(connector)}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-gray-100">
                        {getConnectorIcon(connector)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 group-hover:text-green-700">
                          {connector.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {connector.id === 'walletConnect' ? '手机扫码连接' : '浏览器插件'}
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon size={20} className="text-gray-300 group-hover:text-green-400" />
                  </button>
                ))}
              </div>

              <p className="mt-8 text-center text-xs text-gray-400">
                连接即表示您同意我们的服务条款和隐私政策
              </p>
            </motion.div>
          </motion.div>

          <QRCodeModal
            isOpen={showQR}
            onClose={() => setShowQR(false)}
            uri={uri}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function getConnectorIcon(connector: any) {
  if (connector.icon) {
    return <img src={connector.icon} alt={connector.name} className="w-8 h-8 object-contain" />;
  }
  
  if (connector.id === 'metaMask') {
    return <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Logo.svg" alt="MetaMask" className="w-8 h-8" />;
  }
  
  if (connector.id === 'walletConnect') {
    return <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg" alt="WalletConnect" className="w-8 h-8" />;
  }

  return <span className="text-2xl">👛</span>;
}

function CloseIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function ChevronRightIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
