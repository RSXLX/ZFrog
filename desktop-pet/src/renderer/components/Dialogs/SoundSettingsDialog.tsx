import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SoundSettingsDialogProps {
  visible: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  musicEnabled: boolean;
  onToggleMusic: (enabled: boolean) => void;
}

const SoundSettingsDialog: React.FC<SoundSettingsDialogProps> = ({ visible, onClose, soundEnabled, onToggleSound, musicEnabled, onToggleMusic }) => {
  const sounds = [
    { id: 'pet', label: '抚摸', icon: '👋' },
    { id: 'poke', label: '戳', icon: '👆' },
    { id: 'eat', label: '进食', icon: '🍎' },
    { id: 'achieve', label: '成就', icon: '🏆' },
    { id: 'levelup', label: '升级', icon: '⬆️' },
    { id: 'notification', label: '提示', icon: '🔔' },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="dialog-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ minWidth: 320 }}>
            <button className="dialog-close" onClick={onClose}>×</button>
            <h2 className="dialog-title">🔊 音效设置</h2>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <span>🔊 音效</span>
                <button onClick={() => onToggleSound(!soundEnabled)} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', background: soundEnabled ? '#4ADE80' : '#ccc', color: 'white', cursor: 'pointer' }}>
                  {soundEnabled ? '开启' : '关闭'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <span>🎵 音乐</span>
                <button onClick={() => onToggleMusic(!musicEnabled)} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', background: musicEnabled ? '#4ADE80' : '#ccc', color: 'white', cursor: 'pointer' }}>
                  {musicEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>音效预览 (点击测试)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {sounds.map(sound => (
                <motion.button key={sound.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!soundEnabled} onClick={() => {}} style={{ padding: 12, background: soundEnabled ? '#f5f5f5' : '#e5e5e5', border: 'none', borderRadius: 8, cursor: soundEnabled ? 'pointer' : 'not-allowed', opacity: soundEnabled ? 1 : 0.5 }}>
                  <div style={{ fontSize: 20 }}>{sound.icon}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{sound.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SoundSettingsDialog;
