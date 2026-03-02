import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 60,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      style={{
        background: 'rgba(30, 30, 30, 0.95)',
        borderLeft: `4px solid ${colors[toast.type]}`,
        padding: '12px 16px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 200,
        maxWidth: 300,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <span>{icons[toast.type]}</span>
      <span style={{ color: 'white', fontSize: 13, flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: 16,
          padding: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  );
};

export default Toast;
