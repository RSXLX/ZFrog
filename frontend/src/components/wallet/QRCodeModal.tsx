import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  uri: string;
}

export function QRCodeModal({ isOpen, onClose, uri }: QRCodeModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <CloseIcon size={20} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                扫码连接钱包
              </h3>
              <p className="text-gray-500 text-sm mt-2">
                请使用手机端钱包（如 MetaMask）扫描下方二维码进行授权
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl flex justify-center items-center mb-6">
              {uri ? (
                <QRCodeSVG
                  value={uri}
                  size={220}
                  level="M"
                  includeMargin={false}
                  imageSettings={{
                    src: "https://zetafrog.xyz/icon.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(uri);
                  alert('✅ 已复制到剪贴板！');
                }}
                className="text-xs text-green-600 hover:text-green-700 font-medium py-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                复制连接 URI
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function CloseIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
