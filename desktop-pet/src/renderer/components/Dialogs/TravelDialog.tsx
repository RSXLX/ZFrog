import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

interface TravelDialogProps {
  tokenId: number;
  visible: boolean;
  onClose: () => void;
  onTravelStart: (chain: string, duration: number) => void;
}

const CHAINS = [
  { id: 'zeta_athens', name: 'ZetaChain Athens', icon: '⛓️' },
  { id: 'bsc_testnet', name: 'BSC Testnet', icon: '🟡' },
  { id: 'eth_sepolia', name: 'Ethereum Sepolia', icon: '🔷' },
];

const DURATIONS = [
  { id: 1, name: '1分钟', minutes: 1 },
  { id: 10, name: '10分钟', minutes: 10 },
  { id: 60, name: '1小时', minutes: 60 },
  { id: 1440, name: '1天', minutes: 1440 },
];

const TravelDialog: React.FC<TravelDialogProps> = ({ tokenId, visible, onClose, onTravelStart }) => {
  const [selectedChain, setSelectedChain] = useState(CHAINS[0].id);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0].id);
  const [travelStatus, setTravelStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && tokenId) {
      checkTravelStatus();
    }
  }, [visible, tokenId]);

  const checkTravelStatus = async () => {
    const status = await api.getTravelStatus(tokenId);
    setTravelStatus(status);
  };

  const handleStart = () => {
    onTravelStart(selectedChain, selectedDuration);
    onClose();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: 16, padding: 20,
            width: 320,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>🎒 出发旅行</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {travelStatus?.isTraveling ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 48 }}>🐸</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>旅行中...</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 5 }}>
                剩余时间: {travelStatus.remainingTime || '计算中'}
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>选择目的地</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {CHAINS.map((chain) => (
                  <motion.div
                    key={chain.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedChain(chain.id)}
                    style={{
                      textAlign: 'center', padding: 12, borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedChain === chain.id ? '#e8f5e9' : '#f8f9fa',
                      border: selectedChain === chain.id ? '2px solid #22c55e' : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{chain.icon}</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>{chain.name}</div>
                  </motion.div>
                ))}
              </div>

              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>选择时长</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {DURATIONS.map((duration) => (
                  <motion.div
                    key={duration.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDuration(duration.id)}
                    style={{
                      textAlign: 'center', padding: 10, borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedDuration === duration.id ? '#e8f5e9' : '#f8f9fa',
                      border: selectedDuration === duration.id ? '2px solid #22c55e' : '2px solid transparent',
                    }}
                  >
                    {duration.name}
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                style={{
                  width: '100%', padding: 14, background: 'linear-gradient(135deg, #11998e, #38ef7d)',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                }}
              >
                🚀 开始旅行
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TravelDialog;
