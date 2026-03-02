import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ visible, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPatrol, setAutoPatrol] = useState(false);
  const [startWithSystem, setStartWithSystem] = useState(false);

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
            
            <h2 className="dialog-title">⚙️ 设置</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Sound */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🔊 音效</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: soundEnabled ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {soundEnabled ? '开启' : '关闭'}
                </button>
              </div>
              
              {/* Auto patrol */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🎯 自动巡逻</span>
                <button
                  onClick={() => setAutoPatrol(!autoPatrol)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: autoPatrol ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {autoPatrol ? '开启' : '关闭'}
                </button>
              </div>
              
              {/* Start with system */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>🚀 开机启动</span>
                <button
                  onClick={() => setStartWithSystem(!startWithSystem)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: startWithSystem ? '#4ADE80' : '#ccc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {startWithSystem ? '开启' : '关闭'}
                </button>
              </div>
              
              {/* About */}
              <div style={{ textAlign: 'center', marginTop: 16, color: '#888', fontSize: 12 }}>
                <p>ZetaFrog 🐸 v1.0.0</p>
                <p>基于 Electron + React</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog;
