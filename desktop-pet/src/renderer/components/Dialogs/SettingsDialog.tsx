import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import storage, { StoredSettings } from '../../services/storage';

interface SettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<StoredSettings>(storage.getSettings());
  const [walletInput, setWalletInput] = useState(storage.getWalletAddress() || '');

  useEffect(() => {
    if (visible) {
      setSettings(storage.getSettings());
      setWalletInput(storage.getWalletAddress() || '');
    }
  }, [visible]);

  const handleSave = () => {
    storage.setSettings(settings);
    if (walletInput) {
      storage.setWalletAddress(walletInput);
    }
    onClose();
  };

  const handleExport = () => {
    const data = storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zfrog-backup.json';
    a.click();
  };

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
            width: 320,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>⚙️ 设置</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>钱包地址</label>
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%', padding: 10, borderRadius: 8,
                border: '1px solid #e5e7eb', fontSize: 12,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              启用通知
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) => setSettings({ ...settings, alwaysOnTop: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              窗口置顶
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              style={{
                flex: 1, padding: 12, background: '#11998e', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              保存
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              style={{
                padding: 12, background: '#f8f9fa', color: '#666',
                border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
              }}
            >
              导出
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsDialog;
