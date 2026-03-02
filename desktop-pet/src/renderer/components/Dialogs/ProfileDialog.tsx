import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileDialogProps {
  visible: boolean;
  onClose: () => void;
  petData: {
    name: string;
    level: number;
    exp: number;
    expToNext: number;
    health: number;
    hunger: number;
    energy: number;
    happiness: number;
    charm: number;
    intelligence: number;
  };
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ visible, onClose, petData }) => {
  const getStatColor = (value: number) => {
    if (value > 70) return '#4ADE80';
    if (value > 40) return '#FCD34D';
    return '#F87171';
  };

  const StatBar: React.FC<{ label: string; value: number; icon: string }> = ({ label, value, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{value}/100</span>
        </div>
        <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            style={{ height: '100%', background: getStatColor(value), borderRadius: 3 }}
          />
        </div>
      </div>
    </div>
  );

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
            style={{ position: 'relative', maxWidth: 340 }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">🐸 {petData.name} 的资料</h2>
            
            {/* Level */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', 
                background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px', fontSize: 32, color: 'white',
                boxShadow: '0 4px 12px rgba(74, 222, 128, 0.4)'
              }}>
                Lv.{petData.level}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                经验: {petData.exp}/{petData.expToNext}
              </div>
              <div style={{ height: 4, background: '#eee', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(petData.exp / petData.expToNext) * 100}%` }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #4ADE80, #22C55E)', borderRadius: 2 }}
                />
              </div>
            </div>

            <StatBar label="生命值" value={petData.health} icon="❤️" />
            <StatBar label="饱食度" value={petData.hunger} icon="🍎" />
            <StatBar label="精力" value={petData.energy} icon="⚡" />
            <StatBar label="快乐度" value={petData.happiness} icon="💖" />
            <StatBar label="魅力" value={petData.charm} icon="✨" />
            <StatBar label="智力" value={petData.intelligence} icon="🧠" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileDialog;
