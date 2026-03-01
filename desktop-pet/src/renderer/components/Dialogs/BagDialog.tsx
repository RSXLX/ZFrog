import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BagItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  type: 'food' | 'deco' | 'souvenir';
}

interface BagDialogProps {
  visible: boolean;
  onClose: () => void;
}

const INITIAL_ITEMS: BagItem[] = [
  { id: '1', name: '昆虫大餐', icon: '🦗', count: 5, type: 'food' },
  { id: '2', name: '水果拼盘', icon: '🍓', count: 3, type: 'food' },
  { id: '3', name: '幸运草', icon: '🍀', count: 2, type: 'deco' },
  { id: '4', name: '雅典纪念品', icon: '🏛️', count: 1, type: 'souvenir' },
  { id: '5', name: '青蛙公仔', icon: '🐸', count: 1, type: 'souvenir' },
];

const BagDialog: React.FC<BagDialogProps> = ({ visible, onClose }) => {
  const [items] = useState<BagItem[]>(INITIAL_ITEMS);
  const [selectedItem, setSelectedItem] = useState<BagItem | null>(null);

  if (!visible) return null;

  const foodItems = items.filter(i => i.type === 'food');
  const decoItems = items.filter(i => i.type === 'deco');
  const souvenirItems = items.filter(i => i.type === 'souvenir');

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
            width: 360, maxHeight: '80vh', overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>🎒 背包</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {foodItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>🍔 食物</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {foodItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      textAlign: 'center', padding: 10, background: '#f8f9fa',
                      borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div style={{ fontSize: 10 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 'bold' }}>x{item.count}</div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {decoItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>🎨 装饰</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {decoItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    style={{
                      textAlign: 'center', padding: 10, background: '#f8f9fa',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div style={{ fontSize: 10 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 'bold' }}>x{item.count}</div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {souvenirItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>🎁 纪念品</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {souvenirItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    style={{
                      textAlign: 'center', padding: 10, background: '#fff3e0',
                      borderRadius: 8, border: '1px solid #ffb74d',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div style={{ fontSize: 10 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 'bold' }}>x{item.count}</div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BagDialog;
