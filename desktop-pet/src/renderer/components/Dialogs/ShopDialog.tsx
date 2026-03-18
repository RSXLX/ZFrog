import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShopDialogProps {
  visible: boolean;
  onClose: () => void;
  shop: {
    coins: number;
    items: any[];
    purchase: (id: string) => boolean;
    getItemsByType: (type: string) => any[];
    addCoins: (amount: number) => void;
  };
}

const ShopDialog: React.FC<ShopDialogProps> = ({ visible, onClose, shop }) => {
  const [activeTab, setActiveTab] = useState('food');
  const [purchaseStatus, setPurchaseStatus] = useState<{id: string; success: boolean} | null>(null);

  const tabs = [
    { id: 'food', icon: '🍎', label: '食物' },
    { id: 'toy', icon: '🧸', label: '玩具' },
    { id: 'accessory', icon: '👑', label: '配饰' },
    { id: 'theme', icon: '🎨', label: '主题' },
  ];

  const handlePurchase = (item: any) => {
    const success = shop.purchase(item.id);
    setPurchaseStatus({ id: item.id, success });
    setTimeout(() => setPurchaseStatus(null), 1500);
  };

  const currentItems = shop.getItemsByType(activeTab);

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
            style={{ minWidth: 340, maxWidth: 380 }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">🛒 商店</h2>
            
            {/* Coins display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24 }}>🪙</span>
              <span style={{ fontSize: 24, fontWeight: 'bold', color: '#78350F' }}>
                {shop.coins}
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: activeTab === tab.id ? '#4ADE80' : '#f0f0f0',
                    color: activeTab === tab.id ? 'white' : '#666',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {currentItems.map(item => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    background: item.owned ? '#f0fdf4' : 'white',
                    border: `2px solid ${item.owned ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                    cursor: item.owned ? 'default' : 'pointer',
                  }}
                  onClick={() => !item.owned && handlePurchase(item)}
                >
                  <div style={{ fontSize: 32, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: '600' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{item.description}</div>
                  
                  {item.owned ? (
                    <div style={{ 
                      fontSize: 12, 
                      color: '#22c55e', 
                      fontWeight: '600' 
                    }}>
                      ✅ 已拥有
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 4,
                    }}>
                      <span>🪙</span>
                      <span style={{ 
                        fontSize: 14, 
                        fontWeight: 'bold',
                        color: shop.coins >= item.price ? '#F59E0B' : '#ef4444',
                      }}>
                        {item.price}
                      </span>
                    </div>
                  )}
                  
                  {purchaseStatus?.id === item.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: purchaseStatus && purchaseStatus.success ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      {purchaseStatus && purchaseStatus.success ? '购买成功!' : '金币不足!'}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShopDialog;
