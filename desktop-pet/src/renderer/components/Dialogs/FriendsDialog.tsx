import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

interface Friend {
  frogId: number;
  frogName: string;
  intimacy: number;
  lastVisit: string;
}

interface FriendsDialogProps {
  walletAddress: string;
  visible: boolean;
  onClose: () => void;
}

const FriendsDialog: React.FC<FriendsDialogProps> = ({ walletAddress, visible, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && walletAddress) {
      loadFriends();
    }
  }, [visible, walletAddress]);

  const loadFriends = async () => {
    setLoading(true);
    const data = await api.getFriends(walletAddress);
    setFriends(data);
    setLoading(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="dialog-overlay"
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
            width: 320, maxHeight: '80vh', overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>👥 好友列表</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
              暂无好友<br />
              <small>去旅行时结交新朋友吧！</small>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.frogId}
                style={{
                  display: 'flex', alignItems: 'center', padding: 12,
                  marginBottom: 8, background: '#f8f9fa', borderRadius: 8,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, marginRight: 12,
                }}>
                  🐸
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{friend.frogName}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    亲密度: {friend.intimacy} ❤️
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendsDialog;
