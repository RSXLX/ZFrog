import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '../../hooks/useInventory';

interface BagDialogProps {
  visible: boolean;
  onClose: () => void;
  inventory: {
    items: InventoryItem[];
  };
  onUseItem?: (itemId: string) => void;
}

const sectionConfig: Record<InventoryItem['type'], { title: string; accent: string; actionLabel?: string }> = {
  food: { title: '🍔 食物', accent: '#22c55e', actionLabel: '喂给青蛙' },
  toy: { title: '🧸 玩具', accent: '#0ea5e9', actionLabel: '拿去玩' },
  medicine: { title: '🧪 恢复', accent: '#ef4444', actionLabel: '立即使用' },
  decoration: { title: '🎨 装饰', accent: '#f59e0b' },
  gift: { title: '🎁 礼物', accent: '#8b5cf6' },
};

const BagDialog: React.FC<BagDialogProps> = ({ visible, onClose, inventory, onUseItem }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  if (!visible) return null;

  const availableItems = inventory.items.filter(item => item.quantity > 0);
  const groupedItems = Object.keys(sectionConfig).map(type => ({
    type: type as InventoryItem['type'],
    items: availableItems.filter(item => item.type === type),
  }));
  const selectedItem = availableItems.find(item => item.id === selectedItemId) || availableItems[0] || null;

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

          {availableItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 12px' }}>
              背包还是空的，去旅行或完成长期目标拿点新东西回来吧。
            </div>
          ) : (
            <>
              {groupedItems.map(section => {
                if (section.items.length === 0) return null;

                return (
                  <div key={section.type} style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, color: '#475569', marginBottom: 10 }}>
                      {sectionConfig[section.type].title}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {section.items.map((item) => (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            textAlign: 'center',
                            padding: 10,
                            background: selectedItem?.id === item.id ? `${sectionConfig[item.type].accent}16` : '#f8fafc',
                            borderRadius: 10,
                            cursor: 'pointer',
                            border: `1px solid ${selectedItem?.id === item.id ? sectionConfig[item.type].accent : '#e2e8f0'}`,
                          }}
                        >
                          <div style={{ fontSize: 24 }}>{item.icon}</div>
                          <div style={{ fontSize: 10, color: '#0f172a', marginTop: 4 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: sectionConfig[item.type].accent, fontWeight: 700 }}>x{item.quantity}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {selectedItem ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{selectedItem.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedItem.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{selectedItem.description}</div>
                    </div>
                  </div>

                  {selectedItem.effect ? (
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
                      效果：
                      {selectedItem.effect.hunger ? ` 饱食 +${selectedItem.effect.hunger}` : ''}
                      {selectedItem.effect.happiness ? ` 快乐 +${selectedItem.effect.happiness}` : ''}
                      {selectedItem.effect.energy ? ` 精力 +${selectedItem.effect.energy}` : ''}
                    </div>
                  ) : null}

                  {sectionConfig[selectedItem.type].actionLabel ? (
                    <button
                      type="button"
                      onClick={() => onUseItem?.(selectedItem.id)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: `linear-gradient(135deg, ${sectionConfig[selectedItem.type].accent}, ${sectionConfig[selectedItem.type].accent}cc)`,
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {sectionConfig[selectedItem.type].actionLabel}
                    </button>
                  ) : (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      这类道具更适合放进家园或送给好友，目前还不能直接使用。
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BagDialog;
