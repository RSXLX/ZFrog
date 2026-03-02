import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'achievement';
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<{ notification: NotificationItem; onDismiss: () => void }> = ({ notification, onDismiss }) => {
  const colors = {
    info: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    achievement: '#a855f7',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    achievement: '🏆',
  };

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      style={{
        background: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        borderLeft: `4px solid ${colors[notification.type]}`,
        minWidth: 220,
        maxWidth: 280,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icons[notification.type]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
            {notification.title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {notification.message}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </motion.div>
  );
};

const NotificationContainer: React.FC<NotificationProps> = ({ notifications, onDismiss }) => {
  return (
    <div style={{ position: 'fixed', top: 50, right: 16, zIndex: 2000 }}>
      <AnimatePresence>
        {notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onDismiss={() => onDismiss(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
