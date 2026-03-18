import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FrogCustomizeDialogProps {
  visible: boolean;
  onClose: () => void;
  avatar: any;
  onUpdateAvatar: (part: string, value: string) => void;
}

const FrogCustomizeDialog: React.FC<FrogCustomizeDialogProps> = ({ visible, onClose, avatar, onUpdateAvatar }) => {
  const [activeTab, setActiveTab] = useState('body');

  const tabs = [
    { id: 'body', label: '身体', icon: '🟢' },
    { id: 'eyes', label: '眼睛', icon: '👀' },
    { id: 'mouth', label: '嘴巴', icon: '👄' },
    { id: 'accessory', label: '配饰', icon: '👑' },
  ];

  const options = {
    body: [
      { id: 'default', color: '#4ADE80', label: '绿色' },
      { id: 'pink', color: '#F9A8D4', label: '粉色' },
      { id: 'blue', color: '#60A5FA', label: '蓝色' },
      { id: 'purple', color: '#A78BFA', label: '紫色' },
      { id: 'golden', color: '#FCD34D', label: '金色' },
    ],
    eyes: [
      { id: 'normal', emoji: '😐', label: '普通' },
      { id: 'cute', emoji: '😚', label: '可爱' },
      { id: 'sleepy', emoji: '😴', label: '困倦' },
      { id: 'angry', emoji: '😠', label: '生气' },
      { id: 'happy', emoji: '😄', label: '开心' },
    ],
    mouth: [
      { id: 'smile', emoji: '🙂', label: '微笑' },
      { id: 'open', emoji: '😮', label: '张大' },
      { id: 'small', emoji: '😗', label: '小型' },
      { id: 'tongue', emoji: '😛', label: '吐舌' },
    ],
    accessory: [
      { id: 'none', emoji: '🚫', label: '无' },
      { id: 'crown', emoji: '👑', label: '皇冠' },
      { id: 'hat', emoji: '🎩', label: '礼帽' },
      { id: 'bow', emoji: '🎀', label: '蝴蝶结' },
      { id: 'glasses', emoji: '👓', label: '眼镜' },
      { id: 'flower', emoji: '🌸', label: '花朵' },
    ],
  };

  const currentOptions = options[activeTab as keyof typeof options] || [];
  const selectedBody = options.body.find(option => option.id === avatar.body);
  const selectedEyes = options.eyes.find(option => option.id === avatar.eyes);
  const selectedMouth = options.mouth.find(option => option.id === avatar.mouth);
  const selectedAccessory = options.accessory.find(option => option.id === avatar.accessory);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="dialog-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ minWidth: 340 }}>
            <button className="dialog-close" onClick={onClose}>×</button>
            <h2 className="dialog-title">🎨  customize</h2>
            
            {/* Preview */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <svg width="100" height="100" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="60" fill={selectedBody?.color || '#4ADE80'} />
                <text x="100" y="105" textAnchor="middle" fontSize="40">
                  {selectedEyes?.emoji || '😐'}
                </text>
                <text x="100" y="135" textAnchor="middle" fontSize="30">
                  {selectedMouth?.emoji || '🙂'}
                </text>
                {avatar.accessory !== 'none' && (
                  <text x="100" y="50" textAnchor="middle" fontSize="30">
                    {selectedAccessory?.emoji || ''}
                  </text>
                )}
              </svg>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: 10, background: activeTab === tab.id ? '#4ADE80' : '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer', color: activeTab === tab.id ? 'white' : '#666' }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {currentOptions.map(option => (
                <motion.button key={option.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onUpdateAvatar(activeTab, option.id)} style={{ padding: 12, background: avatar[activeTab as keyof typeof avatar] === option.id ? '#e0f2fe' : 'white', border: `2px solid ${avatar[activeTab as keyof typeof avatar] === option.id ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 12, cursor: 'pointer', textAlign: 'center' }}>
                  {'color' in option ? <div style={{ width: 30, height: 30, borderRadius: '50%', background: option.color, margin: '0 auto 8px' }} /> : <div style={{ fontSize: 24, marginBottom: 4 }}>{'emoji' in option ? option.emoji : ''}</div>}
                  <div style={{ fontSize: 12, color: '#666' }}>{option.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FrogCustomizeDialog;
