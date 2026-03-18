import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '../../hooks/useInventory';
import type { DecorationInstance } from '../../hooks/useDecoration';
import type { LongTermGoalView } from '../../hooks/useLongTermGoals';

interface HomeDialogProps {
  visible: boolean;
  onClose: () => void;
  decorationInventory: InventoryItem[];
  decorations: DecorationInstance[];
  onPlaceDecoration: (itemId: string) => void;
  onRemoveDecoration: (id: string) => void;
  longTermGoals: LongTermGoalView[];
}

const HomeDialog: React.FC<HomeDialogProps> = ({
  visible,
  onClose,
  decorationInventory,
  decorations,
  onPlaceDecoration,
  onRemoveDecoration,
  longTermGoals,
}) => {
  if (!visible) return null;

  const placedTypes = Array.from(new Set(decorations.map(item => item.itemId)));
  const comfortScore = Math.min(100, 40 + decorations.length * 10 + placedTypes.length * 15);
  const decorationGoal = longTermGoals.find(goal => goal.id === 'decoration_set');
  const iconByItemId = decorationInventory.reduce<Record<string, string>>((result, item) => {
    result[item.id] = item.icon;
    return result;
  }, {});

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)',
            borderRadius: 18,
            padding: 20,
            width: 380,
            maxHeight: '84vh',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#166534' }}>🏠 我的家园</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>舒适度</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#14532d' }}>{comfortScore}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>已摆放</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#14532d' }}>{decorations.length}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>套装进度</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#14532d' }}>
                {decorationGoal ? `${decorationGoal.progress}/${decorationGoal.target}` : '0/3'}
              </div>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: 250,
              background: 'linear-gradient(180deg, #86efac 0%, #4ade80 100%)',
              borderRadius: 14,
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 16,
              border: '1px solid rgba(21,128,61,0.18)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '55% 0 0 0',
                background: 'linear-gradient(180deg, rgba(74,222,128,0), rgba(21,128,61,0.45))',
              }}
            />

            {decorations.length === 0 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#166534',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                先从下方挑几个装饰摆进家园吧。
              </div>
            ) : null}

            {decorations.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                style={{
                  position: 'absolute',
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  fontSize: 30 * (item.scale || 1),
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.12 }}
                onClick={() => onRemoveDecoration(item.id)}
                title="点击移除装饰"
              >
                {iconByItemId[item.itemId] || '✨'}
              </motion.button>
            ))}

            <motion.div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 20,
                transform: 'translateX(-50%)',
                fontSize: 40,
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              🐸
            </motion.div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 8 }}>装饰库存</div>
            {decorationInventory.length === 0 ? (
              <div style={{ fontSize: 12, color: '#475569' }}>
                还没有装饰库存，先去旅行或长期目标里拿一些奖励回来。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {decorationInventory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPlaceDecoration(item.id)}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid rgba(21,128,61,0.18)',
                      background: 'rgba(255,255,255,0.75)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, color: '#14532d', marginTop: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>x{item.quantity}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: 12,
              background: 'rgba(255,255,255,0.55)',
              borderRadius: 12,
              color: '#14532d',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>布置说明</div>
            <div>点击库存里的装饰会自动摆进家园，点击场景里的装饰可以收回重摆。</div>
            <div>先凑齐 3 种不同装饰，就能解锁“家园策展人”的长期奖励。</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HomeDialog;
