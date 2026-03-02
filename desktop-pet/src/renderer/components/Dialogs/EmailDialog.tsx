import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  content: string;
  timestamp: number;
  read: boolean;
  type: 'system' | 'friend' | 'gift' | 'reward';
  attachment?: {
    type: 'item' | 'badge' | 'coin';
    name: string;
    amount?: number;
  };
}

interface EmailDialogProps {
  visible: boolean;
  onClose: () => void;
  emails: Email[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const EmailDialog: React.FC<EmailDialogProps> = ({ visible, onClose, emails, onMarkRead, onDelete }) => {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return new Date(timestamp).toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return '📢';
      case 'friend': return '👤';
      case 'gift': return '🎁';
      case 'reward': return '🎉';
      default: return '📧';
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
            style={{ minWidth: 340 }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">📧 邮件</h2>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {emails.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
                  <p>📭 暂无邮件</p>
                </div>
              ) : (
                emails.map(email => (
                  <motion.div
                    key={email.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onMarkRead(email.id)}
                    style={{
                      background: email.read ? 'white' : '#f0f9ff',
                      border: `1px solid ${email.read ? '#e5e7eb' : '#bae6fd'}`,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{getTypeIcon(email.type)}</span>
                      <span style={{ fontWeight: email.read ? 'normal' : 'bold', flex: 1 }}>
                        {email.fromName}
                      </span>
                      <span style={{ fontSize: 11, color: '#888' }}>
                        {formatTime(email.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontWeight: email.read ? 'normal' : '600', marginBottom: 4 }}>
                      {email.subject}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.content}
                    </div>
                    {email.attachment && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: '6px 10px', 
                        background: '#fef3c7', 
                        borderRadius: 6,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span>🎁</span>
                        <span>{email.attachment.name}</span>
                        {email.attachment.amount && <span>×{email.attachment.amount}</span>}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmailDialog;
