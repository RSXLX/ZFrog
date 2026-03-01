import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChainEvent {
  id: string;
  type: 'large_buy' | 'large_sell' | 'price_up' | 'price_down' | 'gas_high';
  message: string;
  time: string;
  frogReaction: string;
}

interface ChainMonitorPanelProps {
  visible: boolean;
  onClose: () => void;
  onSimulate: (event: string) => void;
}

const eventTypes = [
  { id: 'large_buy', label: '大单买入', emoji: '📈', color: '#22c55e' },
  { id: 'large_sell', label: '大单卖出', emoji: '📉', color: '#ef4444' },
  { id: 'price_up', label: '价格大涨', emoji: '🚀', color: '#22c55e' },
  { id: 'price_down', label: '价格暴跌', emoji: '💔', color: '#ef4444' },
  { id: 'gas_high', label: 'Gas 飙升', emoji: '⛽', color: '#f59e0b' },
];

const ChainMonitorPanel: React.FC<ChainMonitorPanelProps> = ({ visible, onClose, onSimulate }) => {
  const [events, setEvents] = useState<ChainEvent[]>([
    { id: '1', type: 'large_buy', message: '检测到 50,000 USDT 大单', time: '2分钟前', frogReaction: '🎉 兴奋' },
    { id: '2', type: 'price_up', message: 'BTC 突破 100,000', time: '5分钟前', frogReaction: '💃 跳舞' },
    { id: '3', type: 'gas_high', message: 'Gas 费达到 150 Gwei', time: '10分钟前', frogReaction: '💭 思考' },
  ]);
  const [monitoring, setMonitoring] = useState(true);

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
            width: 360, maxHeight: '80vh', overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>⛓️ 链上监控</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Status */}
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 10, background: monitoring ? '#f0fdf4' : '#fef2f2', 
            borderRadius: 8, marginBottom: 16 
          }}>
            <span style={{ fontSize: 14 }}>
              {monitoring ? '🟢 监控中' : '🔴 已暂停'}
            </span>
            <button 
              onClick={() => setMonitoring(!monitoring)}
              style={{
                padding: '4px 12px', borderRadius: 4, border: 'none',
                background: monitoring ? '#ef4444' : '#22c55e',
                color: 'white', cursor: 'pointer', fontSize: 12,
              }}
            >
              {monitoring ? '暂停' : '开始'}
            </button>
          </div>

          {/* Event Buttons */}
          <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>模拟事件（测试用）</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {eventTypes.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSimulate(type.id)}
                style={{
                  padding: 8, borderRadius: 6, border: 'none',
                  background: type.color, color: 'white', cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {type.emoji} {type.label}
              </motion.button>
            ))}
          </div>

          {/* Recent Events */}
          <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>最近事件</h3>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                padding: 10, marginBottom: 8, background: '#f8f9fa',
                borderRadius: 8, borderLeft: `3px solid ${
                  event.type === 'large_buy' || event.type === 'price_up' ? '#22c55e' : 
                  event.type === 'large_sell' || event.type === 'price_down' ? '#ef4444' : '#f59e0b'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: 13 }}>
                  {eventTypes.find(t => t.id === event.type)?.emoji} {event.message}
                </span>
                <span style={{ fontSize: 11, color: '#999' }}>{event.time}</span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                青蛙反应: {event.frogReaction}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChainMonitorPanel;
