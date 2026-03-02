import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'busy';
  lastActive: number;
  relationship: number;
}

interface FriendsDialogProps {
  walletAddress: string;
  visible: boolean;
  onClose: () => void;
  friends?: Friend[];
}

const FriendsDialog: React.FC<FriendsDialogProps> = ({ walletAddress, visible, onClose, friends = [] }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'busy': return '#f59e0b';
      case 'offline': return '#9ca3af';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">👥 好友列表</h2>
            
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
              共 {friends.length} 位好友
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
              {friends.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                  <p>暂无好友</p>
                </div>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20
                      }}>
                        {friend.avatar}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 12, height: 12, borderRadius: '50%',
                        background: getStatusColor(friend.status),
                        border: '2px solid white'
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{friend.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Lv.{friend.level}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#f59e0b' }}>❤️ {friend.relationship}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FriendsDialog;
