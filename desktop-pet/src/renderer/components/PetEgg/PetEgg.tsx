/**
 * PetEgg Component
 * 宠物蛋展示组件 - 基于ZFrog桌面宠物框架
 */

import { motion } from 'framer-motion';
import type { Pet, PetStage, PetMood, FoodType } from '../../hooks/usePetEgg';
import './PetEgg.css';

interface PetEggProps {
  pet: Pet | null;
  onFeed: (foodType: FoodType) => void;
  onPlay: () => void;
  onClean: () => void;
  onToggleSleep: () => void;
  onTreat: () => void;
  onCuddle: () => void;
}

// 阶段对应的emoji
const stageEmojis: Record<PetStage, string> = {
  egg: '🥚',
  tadpole: '🐟',
  young_frog: '🐸',
  adult_frog: '👑',
};

// 阶段对应的中文名称
const stageNames: Record<PetStage, string> = {
  egg: '蛋',
  tadpole: '蝌蚪',
  young_frog: '幼蛙',
  adult_frog: '成蛙',
};

// 心情对应的颜色
const moodColors: Record<PetMood, string> = {
  ecstatic: '#00e676',
  happy: '#76ff03',
  content: '#69f0ae',
  neutral: '#b0bec5',
  sad: '#90a4ae',
  angry: '#ff1744',
  depressed: '#78909c',
  sick: '#ff5722',
};

export const PetEgg = ({
  pet,
  onFeed,
  onPlay,
  onClean,
  onToggleSleep,
  onTreat,
  onCuddle,
}: PetEggProps) => {
  if (!pet) {
    return (
      <div className="pet-egg-empty">
        <motion.div
          className="egg-placeholder"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🥚
        </motion.div>
        <p>还没有宠物，点击"创建宠物"开始吧！</p>
      </div>
    );
  }

  const { attributes, stage, mood, name, isSleeping, isSick } = pet;

  // 计算属性条颜色
  const getBarColor = (value: number): string => {
    if (value >= 70) return '#00c853';
    if (value >= 30) return '#ffd600';
    return '#ff3d00';
  };

  return (
    <div className="pet-egg-container">
      {/* 宠物展示区 */}
      <div className="pet-display">
        <motion.div
          className="pet-emoji"
          animate={isSleeping ? {} : { y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '6rem' }}
        >
          {stageEmojis[stage]}
          {isSleeping && <span className="sleep-indicator">💤</span>}
          {isSick && <span className="sick-indicator">🤒</span>}
        </motion.div>

        <div className="pet-info">
          <h2 className="pet-name">{name}</h2>
          <div className="pet-badges">
            <span 
              className="stage-badge"
              style={{ backgroundColor: moodColors[mood] }}
            >
              {stageNames[stage]}
            </span>
            <span className="mood-badge" style={{ color: moodColors[mood] }}>
              {mood === 'sick' ? '🤒 生病' : 
               mood === 'happy' ? '😊 开心' :
               mood === 'sad' ? '😢 难过' : '😐 平静'}
            </span>
          </div>
        </div>
      </div>

      {/* 属性条 */}
      <div className="attributes-panel">
        <h3>状态</h3>
        
        {[
          { key: 'health', icon: '❤️', label: '健康', value: attributes.health },
          { key: 'hunger', icon: '🍖', label: '饥饿', value: attributes.hunger },
          { key: 'happiness', icon: '😊', label: '心情', value: attributes.happiness },
          { key: 'energy', icon: '⚡', label: '精力', value: attributes.energy },
          { key: 'cleanliness', icon: '🧼', label: '卫生', value: attributes.cleanliness },
        ].map((attr) => (
          <div key={attr.key} className="attribute-bar">
            <span className="attr-icon">{attr.icon}</span>
            <span className="attr-label">{attr.label}</span>
            <div className="attr-progress">
              <motion.div
                className="attr-fill"
                initial={{ width: 0 }}
                animate={{ width: `${attr.value}%` }}
                transition={{ duration: 0.5 }}
                style={{ backgroundColor: getBarColor(attr.value) }}
              />
            </div>
            <span className="attr-value">{attr.value}</span>
          </div>
        ))}

        {attributes.cleanliness < 40 && (
          <div className="poop-warning">
            🧼 清洁度偏低，记得给它打扫一下环境。
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <button 
          className="action-btn feed" 
          onClick={() => onFeed('insect' as FoodType)}
          disabled={isSleeping}
        >
          <span className="btn-icon">🍖</span>
          <span className="btn-label">喂食</span>
        </button>

        <button 
          className="action-btn play" 
          onClick={onPlay}
          disabled={isSleeping}
        >
          <span className="btn-icon">🎮</span>
          <span className="btn-label">玩耍</span>
        </button>

        <button 
          className="action-btn clean" 
          onClick={onClean}
          disabled={isSleeping || attributes.cleanliness >= 100}
        >
          <span className="btn-icon">🧹</span>
          <span className="btn-label">清洁</span>
        </button>

        <button 
          className="action-btn sleep" 
          onClick={onToggleSleep}
        >
          <span className="btn-icon">{isSleeping ? '☀️' : '😴'}</span>
          <span className="btn-label">{isSleeping ? '叫醒' : '睡觉'}</span>
        </button>

        <button 
          className="action-btn treat" 
          onClick={onTreat}
          disabled={isSleeping || !isSick}
        >
          <span className="btn-icon">💊</span>
          <span className="btn-label">治疗</span>
        </button>

        <button 
          className="action-btn cuddle" 
          onClick={onCuddle}
          disabled={isSleeping}
        >
          <span className="btn-icon">🤗</span>
          <span className="btn-label">抚摸</span>
        </button>
      </div>
    </div>
  );
};
