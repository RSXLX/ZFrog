# 🐸 ZetaFrog 桌面宠物动画与互动方案

## 📋 方案概述

设计一个有创意、可互动、能实时监控链上大单的桌面青蛙宠物，打造沉浸式的 Web3 桌宠体验。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ZetaFrog 桌面宠物系统                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────┐  │
│   │   动画引擎      │   │   互动系统      │   │   链上监控          │  │
│   │                 │   │                 │   │                     │  │
│   │ • 状态动画      │   │ • 点击互动      │   │ • 大单检测          │  │
│   │ • 表情系统      │   │ • 拖拽移动      │   │ • 实时价格          │  │
│   │ • 粒子效果      │   │ • 语音/文字     │   │ • Gas 监控          │  │
│   │ • 场景切换      │   │ • 喂食系统      │   │ • 鲸鱼追踪          │  │
│   └─────────────────┘   └─────────────────┘   └─────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│                    ┌─────────────────────┐                              │
│                    │    青蛙反应系统     │                              │
│                    │   根据链上事件      │                              │
│                    │   触发特殊动画      │                              │
│                    └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 一、动画状态系统

### 1.1 青蛙状态机

```typescript
// src/types/frogAnimation.ts

export enum FrogState {
  // 基础状态
  IDLE = 'idle',              // 待机 - 正常呼吸
  SLEEPING = 'sleeping',      // 睡觉 - ZZZ
  EATING = 'eating',          // 吃东西
  WALKING = 'walking',        // 走路
  JUMPING = 'jumping',        // 跳跃
  
  // 旅行状态
  TRAVELING = 'traveling',    // 旅行中 - 带小背包
  RETURNING = 'returning',    // 返程 - 带纪念品
  WRITING = 'writing',        // 写日记
  
  // 链上事件反应
  EXCITED = 'excited',        // 兴奋 - 大单买入
  SCARED = 'scared',          // 害怕 - 大单卖出/暴跌
  RICH = 'rich',              // 发财 - 巨鲸交易
  CURIOUS = 'curious',        // 好奇 - 新项目
  DANCING = 'dancing',        // 跳舞 - 行情大涨
  CRYING = 'crying',          // 哭泣 - 行情暴跌
  
  // 互动状态
  HAPPY = 'happy',            // 开心 - 被抚摸
  ANGRY = 'angry',            // 生气 - 被戳太多次
  LOVE = 'love',              // 爱心 - 被喂食
  THINKING = 'thinking',      // 思考 - 等待用户操作
}

export enum FrogMood {
  VERY_HAPPY = 'very_happy',
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  VERY_SAD = 'very_sad',
}

export interface FrogAnimationState {
  currentState: FrogState;
  mood: FrogMood;
  energy: number;          // 0-100 精力值
  hunger: number;          // 0-100 饥饿值
  happiness: number;       // 0-100 快乐值
  lastInteraction: number; // 上次互动时间
  position: { x: number; y: number };
  direction: 'left' | 'right';
}
```

### 1.2 动画配置

```typescript
// src/config/animations.ts

export const ANIMATION_CONFIGS = {
  // 基础状态动画
  [FrogState.IDLE]: {
    frames: 4,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/idle_1.png',
      '/assets/frog/idle_2.png',
      '/assets/frog/idle_3.png',
      '/assets/frog/idle_2.png',
    ],
    particles: null,
    sound: null,
  },
  
  [FrogState.SLEEPING]: {
    frames: 3,
    duration: 3000,
    loop: true,
    sprites: [
      '/assets/frog/sleep_1.png',
      '/assets/frog/sleep_2.png',
      '/assets/frog/sleep_3.png',
    ],
    particles: 'zzz',
    sound: '/sounds/snore.mp3',
  },
  
  [FrogState.EXCITED]: {
    frames: 6,
    duration: 800,
    loop: true,
    sprites: [
      '/assets/frog/excited_1.png',
      '/assets/frog/excited_2.png',
      '/assets/frog/excited_3.png',
      '/assets/frog/excited_4.png',
      '/assets/frog/excited_5.png',
      '/assets/frog/excited_6.png',
    ],
    particles: 'stars',
    sound: '/sounds/excited.mp3',
  },
  
  [FrogState.RICH]: {
    frames: 8,
    duration: 1500,
    loop: true,
    sprites: [
      '/assets/frog/rich_1.png',
      '/assets/frog/rich_2.png',
      // ... 金币飞舞动画
    ],
    particles: 'coins',
    sound: '/sounds/cha-ching.mp3',
  },
  
  [FrogState.SCARED]: {
    frames: 4,
    duration: 500,
    loop: false,
    sprites: [
      '/assets/frog/scared_1.png',
      '/assets/frog/scared_2.png',
      '/assets/frog/scared_3.png',
      '/assets/frog/scared_4.png',
    ],
    particles: 'sweat',
    sound: '/sounds/scared.mp3',
  },
  
  [FrogState.DANCING]: {
    frames: 12,
    duration: 2000,
    loop: true,
    sprites: [
      // 跳舞动画帧
    ],
    particles: 'music_notes',
    sound: '/sounds/dance_music.mp3',
  },
  
  // ... 其他状态配置
};

// 粒子效果配置
export const PARTICLE_CONFIGS = {
  zzz: {
    emoji: '💤',
    count: 3,
    duration: 2000,
    direction: 'up',
    spread: 30,
  },
  stars: {
    emoji: '⭐',
    count: 8,
    duration: 1000,
    direction: 'burst',
    spread: 360,
  },
  coins: {
    emoji: '🪙',
    count: 15,
    duration: 1500,
    direction: 'up',
    spread: 60,
  },
  hearts: {
    emoji: '❤️',
    count: 5,
    duration: 1200,
    direction: 'up',
    spread: 45,
  },
  sweat: {
    emoji: '💦',
    count: 3,
    duration: 800,
    direction: 'right',
    spread: 20,
  },
  music_notes: {
    emoji: '🎵',
    count: 6,
    duration: 1500,
    direction: 'up',
    spread: 90,
  },
  fire: {
    emoji: '🔥',
    count: 10,
    duration: 1000,
    direction: 'up',
    spread: 45,
  },
  tears: {
    emoji: '😢',
    count: 4,
    duration: 1000,
    direction: 'down',
    spread: 30,
  },
};
```

### 1.3 动画组件实现

```tsx
// src/components/frog/FrogPet.tsx

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useFrogState } from '../../hooks/useFrogState';
import { useChainMonitor } from '../../hooks/useChainMonitor';
import { ParticleEffect } from './ParticleEffect';
import { SpeechBubble } from './SpeechBubble';
import { FrogState, FrogMood } from '../../types/frogAnimation';
import { ANIMATION_CONFIGS } from '../../config/animations';

interface FrogPetProps {
  frogId: number;
  name: string;
  initialState?: FrogState;
  onInteract?: (interaction: string) => void;
}

export function FrogPet({ frogId, name, initialState = FrogState.IDLE, onInteract }: FrogPetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  // 青蛙状态管理
  const {
    state,
    mood,
    energy,
    position,
    direction,
    setState,
    setMood,
    updateEnergy,
    setPosition,
    setDirection,
  } = useFrogState(initialState);
  
  // 链上监控
  const { 
    latestEvent, 
    priceChange, 
    whaleAlert,
    gasPrice 
  } = useChainMonitor();
  
  // 当前动画帧
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSpeech, setShowSpeech] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [particles, setParticles] = useState<string | null>(null);
  
  // 动画配置
  const animConfig = ANIMATION_CONFIGS[state];
  
  // 帧动画循环
  useEffect(() => {
    if (!animConfig) return;
    
    const frameTime = animConfig.duration / animConfig.frames;
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= animConfig.frames - 1) {
          return animConfig.loop ? 0 : prev;
        }
        return prev + 1;
      });
    }, frameTime);
    
    return () => clearInterval(interval);
  }, [state, animConfig]);
  
  // 链上事件反应
  useEffect(() => {
    if (!latestEvent) return;
    
    handleChainEvent(latestEvent);
  }, [latestEvent]);
  
  // 鲸鱼警报反应
  useEffect(() => {
    if (!whaleAlert) return;
    
    handleWhaleAlert(whaleAlert);
  }, [whaleAlert]);
  
  // 价格变化反应
  useEffect(() => {
    handlePriceChange(priceChange);
  }, [priceChange]);
  
  // 处理链上事件
  const handleChainEvent = useCallback((event: any) => {
    const { type, value, token } = event;
    
    switch (type) {
      case 'large_buy':
        triggerReaction(FrogState.EXCITED, `哇！有人买了 ${value} ${token}！🚀`, 'stars');
        break;
      case 'large_sell':
        triggerReaction(FrogState.SCARED, `啊！大单卖出 ${value} ${token}！😱`, 'sweat');
        break;
      case 'whale_transfer':
        triggerReaction(FrogState.RICH, `巨鲸出动！${value} ${token} 在移动！🐋`, 'coins');
        break;
      case 'new_listing':
        triggerReaction(FrogState.CURIOUS, `发现新项目：${token}！🔍`, 'stars');
        break;
    }
  }, []);
  
  // 处理鲸鱼警报
  const handleWhaleAlert = useCallback((alert: any) => {
    const { amount, token, direction } = alert;
    
    if (direction === 'in') {
      triggerReaction(
        FrogState.EXCITED, 
        `🐋 鲸鱼买入 ${formatAmount(amount)} ${token}！`, 
        'coins'
      );
    } else {
      triggerReaction(
        FrogState.SCARED, 
        `🐋 鲸鱼卖出 ${formatAmount(amount)} ${token}！`, 
        'sweat'
      );
    }
  }, []);
  
  // 处理价格变化
  const handlePriceChange = useCallback((change: number) => {
    if (Math.abs(change) < 5) return; // 小于 5% 不反应
    
    if (change >= 20) {
      triggerReaction(FrogState.DANCING, `暴涨 ${change.toFixed(1)}%！起飞！🚀🌙`, 'fire');
    } else if (change >= 10) {
      triggerReaction(FrogState.EXCITED, `涨了 ${change.toFixed(1)}%！不错！📈`, 'stars');
    } else if (change <= -20) {
      triggerReaction(FrogState.CRYING, `暴跌 ${change.toFixed(1)}%！呜呜...💔`, 'tears');
    } else if (change <= -10) {
      triggerReaction(FrogState.SCARED, `跌了 ${change.toFixed(1)}%！小心！📉`, 'sweat');
    }
  }, []);
  
  // 触发反应
  const triggerReaction = useCallback((
    newState: FrogState, 
    text: string, 
    particleType: string | null
  ) => {
    setState(newState);
    setSpeechText(text);
    setShowSpeech(true);
    setParticles(particleType);
    
    // 播放音效
    if (animConfig?.sound) {
      const audio = new Audio(animConfig.sound);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
    
    // 5 秒后恢复正常
    setTimeout(() => {
      setState(FrogState.IDLE);
      setShowSpeech(false);
      setParticles(null);
    }, 5000);
  }, [animConfig]);
  
  // 点击互动
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 连续点击计数
    const now = Date.now();
    const clickCount = getClickCount(now);
    
    if (clickCount > 10) {
      // 点太多次会生气
      triggerReaction(FrogState.ANGRY, '别戳了！生气了！😤', null);
    } else if (clickCount > 5) {
      triggerReaction(FrogState.HAPPY, '嘿嘿，好痒！🤭', 'hearts');
    } else {
      // 随机反应
      const reactions = [
        { state: FrogState.HAPPY, text: '你好呀！👋', particles: 'hearts' },
        { state: FrogState.JUMPING, text: '呱呱！🐸', particles: 'stars' },
        { state: FrogState.CURIOUS, text: '嗯？有什么事？🤔', particles: null },
      ];
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      triggerReaction(reaction.state, reaction.text, reaction.particles);
    }
    
    onInteract?.('click');
  }, [onInteract, triggerReaction]);
  
  // 双击互动
  const handleDoubleClick = useCallback(() => {
    triggerReaction(FrogState.LOVE, '最喜欢你了！❤️', 'hearts');
    onInteract?.('double_click');
  }, [onInteract, triggerReaction]);
  
  // 拖拽相关
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setState(FrogState.SCARED);
    setSpeechText('啊啊啊！放我下来！😵');
    setShowSpeech(true);
  }, []);
  
  const handleDragEnd = useCallback((e: any, info: any) => {
    setIsDragging(false);
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
    setState(FrogState.IDLE);
    setShowSpeech(false);
    onInteract?.('drag');
  }, [position, onInteract]);

  return (
    <motion.div
      ref={containerRef}
      className="relative select-none"
      style={{ 
        width: 200, 
        height: 200,
        x: position.x,
        y: position.y,
      }}
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.1 }}
    >
      {/* 阴影 */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/20 rounded-full blur-sm"
        animate={{
          scale: state === FrogState.JUMPING ? [1, 0.5, 1] : 1,
          opacity: state === FrogState.JUMPING ? [0.3, 0.1, 0.3] : 0.3,
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* 青蛙主体 */}
      <motion.div
        className="relative cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        animate={controls}
        style={{
          transform: `scaleX(${direction === 'left' ? -1 : 1})`,
        }}
      >
        {/* 青蛙精灵图 */}
        <motion.img
          src={animConfig?.sprites?.[currentFrame] || '/assets/frog/idle_1.png'}
          alt={name}
          className="w-full h-full object-contain"
          animate={{
            y: state === FrogState.JUMPING ? [0, -30, 0] : 
               state === FrogState.IDLE ? [0, -3, 0] : 0,
            rotate: state === FrogState.DANCING ? [0, -10, 10, 0] :
                    state === FrogState.SCARED ? [-5, 5, -5, 5, 0] : 0,
            scale: state === FrogState.EXCITED ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: state === FrogState.JUMPING ? 0.5 :
                     state === FrogState.IDLE ? 2 :
                     state === FrogState.DANCING ? 0.5 : 0.3,
            repeat: state === FrogState.IDLE || state === FrogState.DANCING ? Infinity : 0,
            ease: 'easeInOut',
          }}
          draggable={false}
        />
        
        {/* 眼睛动画（覆盖层） */}
        <FrogEyes state={state} mood={mood} />
        
        {/* 配件层 */}
        <FrogAccessories state={state} />
      </motion.div>
      
      {/* 粒子效果 */}
      <AnimatePresence>
        {particles && (
          <ParticleEffect 
            type={particles} 
            onComplete={() => setParticles(null)}
          />
        )}
      </AnimatePresence>
      
      {/* 对话气泡 */}
      <AnimatePresence>
        {showSpeech && (
          <SpeechBubble 
            text={speechText} 
            position="top"
            onClose={() => setShowSpeech(false)}
          />
        )}
      </AnimatePresence>
      
      {/* 状态指示器 */}
      <StatusIndicators 
        energy={energy} 
        mood={mood} 
        state={state}
      />
      
      {/* 名字标签 */}
      <motion.div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </motion.div>
    </motion.div>
  );
}

// 青蛙眼睛组件
function FrogEyes({ state, mood }: { state: FrogState; mood: FrogMood }) {
  const eyeVariants = {
    [FrogState.IDLE]: { scaleY: 1 },
    [FrogState.SLEEPING]: { scaleY: 0.1 },
    [FrogState.EXCITED]: { scaleY: 1.2 },
    [FrogState.SCARED]: { scaleY: 1.5 },
    [FrogState.HAPPY]: { scaleY: 0.8 },
    [FrogState.ANGRY]: { scaleY: 0.6 },
  };
  
  const eyeStyle = eyeVariants[state] || eyeVariants[FrogState.IDLE];
  
  return (
    <div className="absolute top-[30%] left-1/2 -translate-x-1/2 flex gap-4">
      <motion.div
        className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
        animate={eyeStyle}
      >
        <motion.div 
          className="w-3 h-3 bg-black rounded-full"
          animate={{
            x: state === FrogState.CURIOUS ? [0, 2, -2, 0] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <motion.div
        className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
        animate={eyeStyle}
      >
        <motion.div 
          className="w-3 h-3 bg-black rounded-full"
          animate={{
            x: state === FrogState.CURIOUS ? [0, 2, -2, 0] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}

// 配件组件
function FrogAccessories({ state }: { state: FrogState }) {
  return (
    <>
      {/* 旅行背包 */}
      {state === FrogState.TRAVELING && (
        <motion.div
          className="absolute -right-2 top-1/2 text-2xl"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          🎒
        </motion.div>
      )}
      
      {/* 返程纪念品 */}
      {state === FrogState.RETURNING && (
        <motion.div
          className="absolute -left-2 top-1/3 text-xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          🎁
        </motion.div>
      )}
      
      {/* 写日记的笔 */}
      {state === FrogState.WRITING && (
        <motion.div
          className="absolute -right-4 top-1/3 text-xl"
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          ✏️
        </motion.div>
      )}
      
      {/* 睡帽 */}
      {state === FrogState.SLEEPING && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🧢
        </motion.div>
      )}
      
      {/* 发财墨镜 */}
      {state === FrogState.RICH && (
        <motion.div
          className="absolute top-[25%] left-1/2 -translate-x-1/2 text-2xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          😎
        </motion.div>
      )}
    </>
  );
}

// 状态指示器
function StatusIndicators({ energy, mood, state }: { 
  energy: number; 
  mood: FrogMood; 
  state: FrogState;
}) {
  const moodEmoji = {
    [FrogMood.VERY_HAPPY]: '😄',
    [FrogMood.HAPPY]: '🙂',
    [FrogMood.NEUTRAL]: '😐',
    [FrogMood.SAD]: '😔',
    [FrogMood.VERY_SAD]: '😢',
  };
  
  return (
    <div className="absolute -top-8 right-0 flex gap-1">
      {/* 心情 */}
      <motion.div
        className="text-lg"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {moodEmoji[mood]}
      </motion.div>
      
      {/* 精力条 */}
      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
          animate={{ width: `${energy}%` }}
        />
      </div>
    </div>
  );
}

// 辅助函数
function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(2);
}

function getClickCount(now: number): number {
  // 实现点击计数逻辑
  return 1;
}
```

---

## ✨ 二、粒子效果系统

```tsx
// src/components/frog/ParticleEffect.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PARTICLE_CONFIGS } from '../../config/animations';

interface ParticleEffectProps {
  type: string;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

export function ParticleEffect({ type, onComplete }: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const config = PARTICLE_CONFIGS[type];
  
  useEffect(() => {
    if (!config) return;
    
    // 生成粒子
    const newParticles: Particle[] = [];
    for (let i = 0; i < config.count; i++) {
      const angle = config.direction === 'burst' 
        ? (360 / config.count) * i 
        : (Math.random() - 0.5) * config.spread;
      
      newParticles.push({
        id: i,
        emoji: config.emoji,
        x: (Math.random() - 0.5) * 40,
        y: 0,
        angle,
        delay: i * 50,
      });
    }
    setParticles(newParticles);
    
    // 动画完成后回调
    const timer = setTimeout(() => {
      onComplete?.();
    }, config.duration + 500);
    
    return () => clearTimeout(timer);
  }, [type, config, onComplete]);
  
  if (!config) return null;
  
  const getEndPosition = (particle: Particle) => {
    const distance = 80 + Math.random() * 40;
    const rad = (particle.angle * Math.PI) / 180;
    
    switch (config.direction) {
      case 'up':
        return { x: particle.x, y: -distance };
      case 'down':
        return { x: particle.x, y: distance };
      case 'burst':
        return {
          x: Math.cos(rad) * distance,
          y: Math.sin(rad) * distance,
        };
      default:
        return { x: distance * 0.5, y: -distance * 0.5 };
    }
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => {
        const end = getEndPosition(particle);
        
        return (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2 text-2xl"
            initial={{
              x: particle.x,
              y: particle.y,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: end.x,
              y: end.y,
              scale: [0, 1.2, 1, 0.5],
              opacity: [0, 1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: config.duration / 1000,
              delay: particle.delay / 1000,
              ease: 'easeOut',
            }}
          >
            {particle.emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

// 预设粒子效果
export function CoinShower({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{
            x: Math.random() * 200 - 100,
            y: -50,
            rotate: 0,
          }}
          animate={{
            y: 200,
            rotate: 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 1,
            ease: 'easeIn',
          }}
        >
          🪙
        </motion.div>
      ))}
    </div>
  );
}

export function HeartBurst({ count = 10 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const distance = 60 + Math.random() * 30;
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 text-xl"
            initial={{ x: 0, y: 0, scale: 0 }}
            animate={{
              x: Math.cos(rad) * distance,
              y: Math.sin(rad) * distance,
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.05,
              ease: 'easeOut',
            }}
          >
            ❤️
          </motion.div>
        );
      })}
    </div>
  );
}
```

---

## 💬 三、对话气泡系统

```tsx
// src/components/frog/SpeechBubble.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SpeechBubbleProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  autoHide?: boolean;
  duration?: number;
  onClose?: () => void;
}

export function SpeechBubble({ 
  text, 
  position = 'top',
  autoHide = true,
  duration = 4000,
  onClose 
}: SpeechBubbleProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  // 打字机效果
  useEffect(() => {
    setDisplayText('');
    setIsTyping(true);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [text]);
  
  // 自动隐藏
  useEffect(() => {
    if (!autoHide) return;
    
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [autoHide, duration, onClose]);
  
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-4',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-4',
    left: 'right-full top-1/2 -translate-y-1/2 mr-4',
    right: 'left-full top-1/2 -translate-y-1/2 ml-4',
  };
  
  const tailStyles = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white',
  };
  
  return (
    <motion.div
      className={`absolute ${positionStyles[position]} z-10`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="relative bg-white rounded-2xl shadow-lg px-4 py-3 max-w-[200px]">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {displayText}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              |
            </motion.span>
          )}
        </p>
        
        {/* 气泡尾巴 */}
        <div className={`absolute w-0 h-0 ${tailStyles[position]}`} />
      </div>
    </motion.div>
  );
}

// 思考气泡
export function ThinkingBubble({ position = 'top' }: { position?: 'top' | 'right' }) {
  return (
    <motion.div
      className={`absolute ${
        position === 'top' 
          ? 'bottom-full left-1/2 -translate-x-1/2 mb-8' 
          : 'left-full top-0 ml-4'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 小圆点 */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-5 left-1/2 -translate-x-1/4 w-3 h-3 bg-white rounded-full shadow"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
      />
      
      {/* 主气泡 */}
      <div className="bg-white rounded-full shadow-lg px-4 py-2">
        <motion.span
          className="text-gray-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          💭 ...
        </motion.span>
      </div>
    </motion.div>
  );
}
```

---

## ⛓️ 四、链上监控系统

```typescript
// src/hooks/useChainMonitor.ts

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { zetachainAthens } from '../config/chains';

// 监控事件类型
export interface ChainEvent {
  type: 'large_buy' | 'large_sell' | 'whale_transfer' | 'new_listing' | 'price_change';
  token: string;
  value: number;
  from?: string;
  to?: string;
  timestamp: number;
  txHash?: string;
}

export interface WhaleAlert {
  address: string;
  amount: number;
  token: string;
  direction: 'in' | 'out';
  timestamp: number;
}

export interface ChainMonitorState {
  latestEvent: ChainEvent | null;
  priceChange: number;
  whaleAlert: WhaleAlert | null;
  gasPrice: bigint;
  isConnected: boolean;
  events: ChainEvent[];
}

// 监控配置
const MONITOR_CONFIG = {
  // 大单阈值 (USD)
  largeTradeThreshold: 100000,
  // 巨鲸阈值 (USD)
  whaleThreshold: 1000000,
  // 价格变化警报阈值 (%)
  priceAlertThreshold: 5,
  // 监控的代币地址
  watchedTokens: [
    { address: '0x...', symbol: 'ZETA', decimals: 18 },
    { address: '0x...', symbol: 'ETH', decimals: 18 },
  ],
  // 监控的鲸鱼地址
  watchedWhales: [
    '0x...', // 已知鲸鱼地址
  ],
  // 轮询间隔 (ms)
  pollInterval: 10000,
};

export function useChainMonitor() {
  const [state, setState] = useState<ChainMonitorState>({
    latestEvent: null,
    priceChange: 0,
    whaleAlert: null,
    gasPrice: BigInt(0),
    isConnected: false,
    events: [],
  });
  
  const clientRef = useRef<any>(null);
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());
  
  // 初始化客户端
  useEffect(() => {
    clientRef.current = createPublicClient({
      chain: mainnet, // 或 zetachainAthens
      transport: http(),
    });
    
    setState(prev => ({ ...prev, isConnected: true }));
    
    return () => {
      setState(prev => ({ ...prev, isConnected: false }));
    };
  }, []);
  
  // 监控大额转账
  const monitorLargeTransfers = useCallback(async () => {
    if (!clientRef.current) return;
    
    try {
      // 获取最新区块的转账事件
      const latestBlock = await clientRef.current.getBlockNumber();
      
      // ERC20 Transfer 事件签名
      const transferEventAbi = parseAbi([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]);
      
      for (const token of MONITOR_CONFIG.watchedTokens) {
        const logs = await clientRef.current.getLogs({
          address: token.address as `0x${string}`,
          event: transferEventAbi[0],
          fromBlock: latestBlock - BigInt(10),
          toBlock: latestBlock,
        });
        
        for (const log of logs) {
          const value = Number(formatEther(log.args.value || BigInt(0)));
          const valueUsd = value * await getTokenPrice(token.symbol);
          
          if (valueUsd >= MONITOR_CONFIG.largeTradeThreshold) {
            const event: ChainEvent = {
              type: isKnownDex(log.args.to) ? 'large_sell' : 
                    isKnownDex(log.args.from) ? 'large_buy' : 'whale_transfer',
              token: token.symbol,
              value: valueUsd,
              from: log.args.from,
              to: log.args.to,
              timestamp: Date.now(),
              txHash: log.transactionHash,
            };
            
            addEvent(event);
            
            // 检查是否为鲸鱼
            if (MONITOR_CONFIG.watchedWhales.includes(log.args.from || '') ||
                MONITOR_CONFIG.watchedWhales.includes(log.args.to || '')) {
              setState(prev => ({
                ...prev,
                whaleAlert: {
                  address: log.args.from || log.args.to || '',
                  amount: valueUsd,
                  token: token.symbol,
                  direction: isKnownDex(log.args.to) ? 'out' : 'in',
                  timestamp: Date.now(),
                },
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('监控大额转账失败:', error);
    }
  }, []);
  
  // 监控价格变化
  const monitorPriceChanges = useCallback(async () => {
    try {
      for (const token of MONITOR_CONFIG.watchedTokens) {
        const currentPrice = await getTokenPrice(token.symbol);
        const history = priceHistoryRef.current.get(token.symbol) || [];
        
        // 保存历史价格 (最近 60 个数据点)
        history.push(currentPrice);
        if (history.length > 60) history.shift();
        priceHistoryRef.current.set(token.symbol, history);
        
        // 计算 5 分钟价格变化
        if (history.length >= 30) {
          const oldPrice = history[0];
          const change = ((currentPrice - oldPrice) / oldPrice) * 100;
          
          if (Math.abs(change) >= MONITOR_CONFIG.priceAlertThreshold) {
            setState(prev => ({ ...prev, priceChange: change }));
            
            addEvent({
              type: 'price_change',
              token: token.symbol,
              value: change,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      console.error('监控价格变化失败:', error);
    }
  }, []);
  
  // 监控 Gas 价格
  const monitorGasPrice = useCallback(async () => {
    if (!clientRef.current) return;
    
    try {
      const gasPrice = await clientRef.current.getGasPrice();
      setState(prev => ({ ...prev, gasPrice }));
    } catch (error) {
      console.error('获取 Gas 价格失败:', error);
    }
  }, []);
  
  // 添加事件
  const addEvent = useCallback((event: ChainEvent) => {
    setState(prev => ({
      ...prev,
      latestEvent: event,
      events: [event, ...prev.events].slice(0, 50), // 保留最近 50 条
    }));
  }, []);
  
  // 启动监控
  useEffect(() => {
    const interval = setInterval(() => {
      monitorLargeTransfers();
      monitorPriceChanges();
      monitorGasPrice();
    }, MONITOR_CONFIG.pollInterval);
    
    // 立即执行一次
    monitorLargeTransfers();
    monitorPriceChanges();
    monitorGasPrice();
    
    return () => clearInterval(interval);
  }, [monitorLargeTransfers, monitorPriceChanges, monitorGasPrice]);
  
  // 手动刷新
  const refresh = useCallback(() => {
    monitorLargeTransfers();
    monitorPriceChanges();
    monitorGasPrice();
  }, [monitorLargeTransfers, monitorPriceChanges, monitorGasPrice]);
  
  // 清除警报
  const clearAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      latestEvent: null,
      whaleAlert: null,
      priceChange: 0,
    }));
  }, []);
  
  return {
    ...state,
    refresh,
    clearAlerts,
  };
}

// 辅助函数：获取代币价格
async function getTokenPrice(symbol: string): Promise<number> {
  try {
    // 可以接入 CoinGecko、Chainlink 等价格源
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoingeckoId(symbol)}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[getCoingeckoId(symbol)]?.usd || 0;
  } catch {
    return 0;
  }
}

function getCoingeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'ETH': 'ethereum',
    'ZETA': 'zetachain',
    'BTC': 'bitcoin',
  };
  return mapping[symbol] || symbol.toLowerCase();
}

function isKnownDex(address?: string): boolean {
  if (!address) return false;
  const dexAddresses = [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    // ... 更多 DEX 地址
  ];
  return dexAddresses.includes(address.toLowerCase());
}
```

---

## 🎮 五、互动系统

```typescript
// src/hooks/useFrogInteraction.ts

import { useState, useCallback, useRef } from 'react';
import { FrogState, FrogMood } from '../types/frogAnimation';

interface InteractionStats {
  totalClicks: number;
  totalPets: number;
  totalFeeds: number;
  totalTravels: number;
  lastInteraction: number;
}

export function useFrogInteraction() {
  const [stats, setStats] = useState<InteractionStats>({
    totalClicks: 0,
    totalPets: 0,
    totalFeeds: 0,
    totalTravels: 0,
    lastInteraction: Date.now(),
  });
  
  const clickTimestamps = useRef<number[]>([]);
  
  // 记录点击
  const recordClick = useCallback(() => {
    const now = Date.now();
    
    // 清理 2 秒前的点击记录
    clickTimestamps.current = clickTimestamps.current.filter(
      ts => now - ts < 2000
    );
    clickTimestamps.current.push(now);
    
    setStats(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + 1,
      lastInteraction: now,
    }));
    
    return clickTimestamps.current.length;
  }, []);
  
  // 抚摸
  const pet = useCallback(() => {
    setStats(prev => ({
      ...prev,
      totalPets: prev.totalPets + 1,
      lastInteraction: Date.now(),
    }));
  }, []);
  
  // 喂食
  const feed = useCallback((foodType: string) => {
    setStats(prev => ({
      ...prev,
      totalFeeds: prev.totalFeeds + 1,
      lastInteraction: Date.now(),
    }));
    
    // 返回喂食效果
    const effects: Record<string, { energy: number; happiness: number }> = {
      'fly': { energy: 10, happiness: 5 },      // 苍蝇 - 普通
      'worm': { energy: 20, happiness: 10 },    // 虫子 - 好吃
      'cricket': { energy: 30, happiness: 15 }, // 蟋蟀 - 美味
      'golden_fly': { energy: 50, happiness: 30 }, // 金苍蝇 - 稀有
    };
    
    return effects[foodType] || { energy: 5, happiness: 2 };
  }, []);
  
  // 检查是否需要注意力
  const needsAttention = useCallback(() => {
    const timeSinceLastInteraction = Date.now() - stats.lastInteraction;
    return timeSinceLastInteraction > 5 * 60 * 1000; // 5 分钟没互动
  }, [stats.lastInteraction]);
  
  // 获取互动建议
  const getSuggestion = useCallback((): string => {
    if (needsAttention()) {
      return '我有点无聊...来玩玩吧！';
    }
    
    const suggestions = [
      '点击我可以互动哦！',
      '双击有惊喜~',
      '可以拖动我移动位置！',
      '给我找点虫子吃吧~',
      '想不想派我去旅行？',
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }, [needsAttention]);
  
  return {
    stats,
    recordClick,
    pet,
    feed,
    needsAttention,
    getSuggestion,
  };
}
```

---

## 🍽️ 六、喂食系统

```tsx
// src/components/frog/FeedingSystem.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogInteraction } from '../../hooks/useFrogInteraction';

interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  energy: number;
  happiness: number;
}

const FOOD_ITEMS: FoodItem[] = [
  { id: 'fly', name: '苍蝇', emoji: '🪰', rarity: 'common', energy: 10, happiness: 5 },
  { id: 'worm', name: '虫子', emoji: '🪱', rarity: 'common', energy: 15, happiness: 8 },
  { id: 'cricket', name: '蟋蟀', emoji: '🦗', rarity: 'uncommon', energy: 25, happiness: 15 },
  { id: 'butterfly', name: '蝴蝶', emoji: '🦋', rarity: 'uncommon', energy: 20, happiness: 20 },
  { id: 'dragonfly', name: '蜻蜓', emoji: '🪰', rarity: 'rare', energy: 35, happiness: 25 },
  { id: 'golden_fly', name: '金苍蝇', emoji: '✨🪰', rarity: 'legendary', energy: 50, happiness: 40 },
];

interface FeedingSystemProps {
  onFeed: (food: FoodItem) => void;
  inventory: Record<string, number>;
}

export function FeedingSystem({ onFeed, inventory }: FeedingSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  
  const rarityColors = {
    common: 'bg-gray-100 border-gray-300',
    uncommon: 'bg-green-100 border-green-300',
    rare: 'bg-blue-100 border-blue-300',
    legendary: 'bg-yellow-100 border-yellow-300',
  };
  
  const handleFeed = (food: FoodItem) => {
    if ((inventory[food.id] || 0) <= 0) return;
    
    setSelectedFood(food);
    onFeed(food);
    
    // 播放喂食动画
    setTimeout(() => {
      setSelectedFood(null);
    }, 1000);
  };
  
  return (
    <div className="relative">
      {/* 喂食按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg flex items-center justify-center text-2xl"
      >
        🍽️
      </motion.button>
      
      {/* 食物菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl p-4 min-w-[200px]"
          >
            <h3 className="font-bold text-gray-800 mb-3">喂食</h3>
            
            <div className="space-y-2">
              {FOOD_ITEMS.map((food) => {
                const count = inventory[food.id] || 0;
                
                return (
                  <motion.button
                    key={food.id}
                    whileHover={{ x: 5 }}
                    onClick={() => handleFeed(food)}
                    disabled={count <= 0}
                    className={`
                      w-full flex items-center gap-3 p-2 rounded-xl border-2
                      ${rarityColors[food.rarity]}
                      ${count <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                      transition-all
                    `}
                  >
                    <span className="text-2xl">{food.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{food.name}</p>
                      <p className="text-xs text-gray-500">
                        ⚡{food.energy} 😊{food.happiness}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-600">
                      x{count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 喂食动画 */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -50 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl"
          >
            {selectedFood.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## 📊 七、链上事件通知面板

```tsx
// src/components/frog/ChainEventPanel.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useChainMonitor } from '../../hooks/useChainMonitor';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function ChainEventPanel() {
  const { events, gasPrice, isConnected, refresh } = useChainMonitor();
  
  const eventIcons: Record<string, string> = {
    large_buy: '🟢',
    large_sell: '🔴',
    whale_transfer: '🐋',
    new_listing: '🆕',
    price_change: '📊',
  };
  
  const eventLabels: Record<string, string> = {
    large_buy: '大单买入',
    large_sell: '大单卖出',
    whale_transfer: '鲸鱼转账',
    new_listing: '新项目',
    price_change: '价格变动',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-4 top-20 w-80 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            ⛓️ 链上监控
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-400'}`} />
          </h3>
          <motion.button
            whileHover={{ rotate: 180 }}
            onClick={refresh}
            className="text-white/80 hover:text-white"
          >
            🔄
          </motion.button>
        </div>
        
        {/* Gas 价格 */}
        <div className="mt-2 text-sm text-white/80">
          ⛽ Gas: {Number(gasPrice / BigInt(1e9)).toFixed(1)} Gwei
        </div>
      </div>
      
      {/* 事件列表 */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {events.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-4xl mb-2">🐸</p>
              <p>暂无事件</p>
              <p className="text-xs">青蛙正在监控中...</p>
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={`${event.timestamp}-${index}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{eventIcons[event.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {eventLabels[event.type]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(event.timestamp, { 
                          addSuffix: true, 
                          locale: zhCN 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {event.type === 'price_change' 
                        ? `${event.token} ${event.value > 0 ? '📈' : '📉'} ${event.value.toFixed(2)}%`
                        : `${formatValue(event.value)} ${event.token}`
                      }
                    </p>
                    {event.txHash && (
                      <a
                        href={`https://etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        查看交易 ↗
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000) return `\${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `\${(value / 1000).toFixed(2)}K`;
  return `\${value.toFixed(2)}`;
}
```

---

## 🎯 八、完整集成示例

```tsx
// src/pages/Desktop.tsx

import { useState } from 'react';
import { FrogPet } from '../components/frog/FrogPet';
import { ChainEventPanel } from '../components/frog/ChainEventPanel';
import { FeedingSystem } from '../components/frog/FeedingSystem';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { useWallet } from '../hooks/useWallet';
import { useFrogData } from '../hooks/useFrogData';

export function Desktop() {
  const { isConnected, address } = useWallet();
  const { frogs, activeFrog } = useFrogData(address);
  
  const [inventory, setInventory] = useState({
    fly: 10,
    worm: 5,
    cricket: 3,
    butterfly: 2,
    dragonfly: 1,
    golden_fly: 0,
  });
  
  const handleFeed = (food: any) => {
    setInventory(prev => ({
      ...prev,
      [food.id]: Math.max(0, (prev[food.id] || 0) - 1),
    }));
  };
  
  const handleInteract = (interaction: string) => {
    console.log('Interaction:', interaction);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-green-100 to-green-200 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 云朵 */}
        <div className="absolute top-10 left-10 text-6xl opacity-50">☁️</div>
        <div className="absolute top-20 right-20 text-4xl opacity-40">☁️</div>
        <div className="absolute top-5 left-1/2 text-5xl opacity-45">☁️</div>
        
        {/* 草地 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-500 to-transparent" />
      </div>
      
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐸</span>
            <span className="font-bold text-xl text-gray-800">ZetaFrog Desktop</span>
          </div>
          <ConnectButton />
        </div>
      </nav>
      
      {/* 主要内容 */}
      <main className="pt-24 pb-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* 青蛙区域 */}
          <div className="flex justify-center items-center min-h-[60vh]">
            {activeFrog ? (
              <FrogPet
                frogId={activeFrog.id}
                name={activeFrog.name}
                initialState={activeFrog.status}
                onInteract={handleInteract}
              />
            ) : (
              <div className="text-center">
                <p className="text-6xl mb-4">🥚</p>
                <p className="text-gray-600">你还没有青蛙</p>
                <p className="text-sm text-gray-400">连接钱包并铸造一只吧！</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* 喂食系统 */}
      <div className="fixed left-4 bottom-4 z-40">
        <FeedingSystem 
          onFeed={handleFeed}
          inventory={inventory}
        />
      </div>
      
      {/* 链上监控面板 */}
      <ChainEventPanel />
      
      {/* 快捷操作栏 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex gap-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
          <ActionButton emoji="🎒" label="旅行" />
          <ActionButton emoji="📖" label="日记" />
          <ActionButton emoji="🎁" label="纪念品" />
          <ActionButton emoji="⚙️" label="设置" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ emoji, label }: { emoji: string; label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-1 px-3"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </motion.button>
  );
}
```

---

## 📋 创意功能总结

| 功能模块 | 特色 | 互动方式 |
|---------|------|---------|
| **状态动画** | 15+ 种青蛙状态，丰富表情 | 自动切换 |
| **粒子效果** | 星星、金币、爱心、音符等 | 事件触发 |
| **对话气泡** | 打字机效果，智能对话 | 互动触发 |
| **链上监控** | 大单检测、鲸鱼追踪、价格警报 | 实时推送 |
| **喂食系统** | 多种食物，稀有度机制 | 主动喂食 |
| **点击互动** | 单击、双击、连击反应 | 用户操作 |
| **拖拽移动** | 可拖动到任意位置 | 用户操作 |
| **心情系统** | 根据互动和事件变化 | 综合计算 |

这个方案将 **桌面宠物的趣味性** 与 **Web3 链上数据** 完美结合，让用户在养成青蛙的同时实时了解市场动态！🐸⛓️