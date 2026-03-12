/**
 * Tadpole Component - Phase 2: 蝌蚪阶段组件
 * 
 * 功能：
 * - 蝌蚪的游泳动画（水波纹效果）
 * - 变态发育可视化（后腿→前腿→尾巴吸收）
 * - 与 usePetEgg hook 集成
 * - 响应式水生环境
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import './Tadpole.css';

// ==================== 类型定义 ====================

export type TadpoleStage = 'newly_hatched' | 'early' | 'mid' | 'late' | 'pre_frog';

export interface TadpoleFeatures {
  hasHindLegs: boolean;
  hasFrontLegs: boolean;
  tailLength: number; // 0-1, 1 = full tail
  bodySize: number; // 0.5-1.5
  color: string;
}

export interface WaterEnvironment {
  temperature: number; // 15-30°C
  oxygen: number; // 0-100%
  cleanliness: number; // 0-100%
  flowSpeed: number; // 0-10
  depth: number; // cm
}

export interface TadpoleProps {
  stage: TadpoleStage;
  features: TadpoleFeatures;
  environment: WaterEnvironment;
  growth: number; // 0-100
  isEating?: boolean;
  isMoving?: boolean;
  direction?: 'left' | 'right';
  onEnvironmentChange?: (env: Partial<WaterEnvironment>) => void;
  className?: string;
}

// ==================== 常量定义 ====================

const STAGE_CONFIG: Record<TadpoleStage, {
  label: string;
  description: string;
  minGrowth: number;
  maxGrowth: number;
  legDevelopment: { hind: number; front: number };
  tailRetention: number;
}> = {
  newly_hatched: {
    label: '刚孵化',
    description: '刚从蛋中孵化，依赖卵黄囊',
    minGrowth: 0,
    maxGrowth: 20,
    legDevelopment: { hind: 0, front: 0 },
    tailRetention: 1,
  },
  early: {
    label: '早期',
    description: '开始游泳，后腿芽出现',
    minGrowth: 20,
    maxGrowth: 45,
    legDevelopment: { hind: 0.2, front: 0 },
    tailRetention: 1,
  },
  mid: {
    label: '中期',
    description: '后腿发育，尾巴开始收缩',
    minGrowth: 45,
    maxGrowth: 70,
    legDevelopment: { hind: 0.6, front: 0.2 },
    tailRetention: 0.8,
  },
  late: {
    label: '晚期',
    description: '前后腿形成，尾巴大幅吸收',
    minGrowth: 70,
    maxGrowth: 90,
    legDevelopment: { hind: 1, front: 0.7 },
    tailRetention: 0.4,
  },
  pre_frog: {
    label: '成蛙前',
    description: '即将变态为青蛙',
    minGrowth: 90,
    maxGrowth: 100,
    legDevelopment: { hind: 1, front: 1 },
    tailRetention: 0.1,
  },
};

const TADPOLE_COLORS = [
  '#3d6b4f', // 深绿
  '#4a7c59', // 绿色
  '#5a8f6a', // 浅绿
  '#2d5a3d', // 墨绿
  '#6b8e6b', // 灰绿
];

// ==================== 辅助函数 ====================

const getStageFromGrowth = (growth: number): TadpoleStage => {
  for (const [stage, config] of Object.entries(STAGE_CONFIG)) {
    if (growth >= config.minGrowth && growth <= config.maxGrowth) {
      return stage as TadpoleStage;
    }
  }
  return 'pre_frog';
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ==================== 子组件 ====================

/**
 * 水波纹效果
 */
const WaterRipples: React.FC<{
  count: number;
  flowSpeed: number;
}> = ({ count, flowSpeed }) => {
  return (
    <div className="water-ripples">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="ripple"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * (0.5 / flowSpeed),
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

/**
 * 蝌蚪身体 SVG
 */
const TadpoleBody: React.FC<{
  features: TadpoleFeatures;
  stage: TadpoleStage;
  isSwimming: boolean;
  direction: 'left' | 'right';
}> = ({ features, stage, isSwimming, direction }) => {
  const stageConfig = STAGE_CONFIG[stage];
  const { hasHindLegs, hasFrontLegs, tailLength, bodySize, color } = features;
  
  // 计算腿的发育程度
  const hindLegProgress = stageConfig.legDevelopment.hind;
  const frontLegProgress = stageConfig.legDevelopment.front;
  
  // 身体尺寸
  const baseWidth = 40 * bodySize;
  const baseHeight = 30 * bodySize;
  
  // 尾巴长度（基于阶段）
  const currentTailLength = 80 * tailLength * (0.5 + stageConfig.tailRetention * 0.5);
  
  // 游泳动画
  const tailSway = isSwimming ? 15 : 5;
  
  // 方向翻转
  const flipX = direction === 'left' ? -1 : 1;
  
  return (
    <motion.svg
      viewBox="0 0 200 150"
      className="tadpole-svg"
      style={{ overflow: 'visible' }}
      animate={{
        x: isSwimming ? [0, 5 * flipX, 0] : 0,
      }}
      transition={{
        duration: 1,
        repeat: isSwimming ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      <defs>
        <radialGradient id="tadpoleBodyGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="70%" stopColor={color} stopOpacity={0.7} />
          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
        </radialGradient>
        
        <filter id="tadpoleShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)" />
        </filter>
      </defs>
      
      {/* 尾巴 */}
      <motion.path
        d={`M ${100 + baseWidth/2} 75 
            Q ${100 + baseWidth/2 + currentTailLength * 0.5} 75 
              ${100 + baseWidth/2 + currentTailLength} 75
            Q ${100 + baseWidth/2 + currentTailLength * 0.5} 75 
              ${100 + baseWidth/2} 75`}
        fill={color}
        opacity={0.6}
        animate={{
          d: [
            `M ${100 + baseWidth/2} 75 
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 - tailSway} 
               ${100 + baseWidth/2 + currentTailLength} 75
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 + tailSway} 
               ${100 + baseWidth/2} 75`,
            `M ${100 + baseWidth/2} 75 
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 + tailSway} 
               ${100 + baseWidth/2 + currentTailLength} 75
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 - tailSway} 
               ${100 + baseWidth/2} 75`,
            `M ${100 + baseWidth/2} 75 
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 - tailSway} 
               ${100 + baseWidth/2 + currentTailLength} 75
             Q ${100 + baseWidth/2 + currentTailLength * 0.5} ${75 + tailSway} 
               ${100 + baseWidth/2} 75`,
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* 身体 */}
      <motion.ellipse
        cx={100}
        cy={75}
        rx={baseWidth / 2}
        ry={baseHeight / 2}
        fill="url(#tadpoleBodyGrad)"
        filter="url(#tadpoleShadow)"
        animate={{
          scaleX: isSwimming ? [1, 1.02, 1] : 1,
          scaleY: isSwimming ? [1, 0.98, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isSwimming ? Infinity : 0,
        }}
      />
      
      {/* 眼睛 */}
      <motion.g>
        {/* 左眼 */}
        <circle cx={100 - baseWidth/4} cy={75 - baseHeight/6} r={4} fill="black" />
        <circle cx={100 - baseWidth/4 + 1} cy={75 - baseHeight/6 - 1} r={1.5} fill="white" />
        
        {/* 右眼 */}
        <circle cx={100 + baseWidth/4} cy={75 - baseHeight/6} r={4} fill="black" />
        <circle cx={100 + baseWidth/4 + 1} cy={75 - baseHeight/6 - 1} r={1.5} fill="white" />
      </motion.g>
      
      {/* 后腿 */}
      {hindLegProgress > 0 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: hindLegProgress }}
        >
          {/* 左后腿 */}
          <motion.path
            d={`M ${100 - baseWidth/3} ${75 + baseHeight/4} 
                Q ${100 - baseWidth/2} ${75 + baseHeight/2} 
                  ${100 - baseWidth/2 - 10} ${75 + baseHeight/2 + 15}`}
            stroke={color}
            strokeWidth={3 * hindLegProgress}
            fill="none"
            strokeLinecap="round"
            animate={isSwimming ? {
              d: [
                `M ${100 - baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 - baseWidth/2} ${75 + baseHeight/2} 
                   ${100 - baseWidth/2 - 10} ${75 + baseHeight/2 + 15}`,
                `M ${100 - baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 - baseWidth/2 - 5} ${75 + baseHeight/2 + 5} 
                   ${100 - baseWidth/2 - 15} ${75 + baseHeight/2 + 10}`,
                `M ${100 - baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 - baseWidth/2} ${75 + baseHeight/2} 
                   ${100 - baseWidth/2 - 10} ${75 + baseHeight/2 + 15}`,
              ]
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          
          {/* 右后腿 */}
          <motion.path
            d={`M ${100 + baseWidth/3} ${75 + baseHeight/4} 
                Q ${100 + baseWidth/2} ${75 + baseHeight/2} 
                  ${100 + baseWidth/2 + 10} ${75 + baseHeight/2 + 15}`}
            stroke={color}
            strokeWidth={3 * hindLegProgress}
            fill="none"
            strokeLinecap="round"
            animate={isSwimming ? {
              d: [
                `M ${100 + baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 + baseWidth/2} ${75 + baseHeight/2} 
                   ${100 + baseWidth/2 + 10} ${75 + baseHeight/2 + 15}`,
                `M ${100 + baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 + baseWidth/2 + 5} ${75 + baseHeight/2 + 5} 
                   ${100 + baseWidth/2 + 15} ${75 + baseHeight/2 + 10}`,
                `M ${100 + baseWidth/3} ${75 + baseHeight/4} 
                 Q ${100 + baseWidth/2} ${75 + baseHeight/2} 
                   ${100 + baseWidth/2 + 10} ${75 + baseHeight/2 + 15}`,
              ]
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }}
          />
        </motion.g>
      )}
      
      {/* 前腿 */}
      {frontLegProgress > 0 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: frontLegProgress }}
        >
          {/* 左前腿 */}
          <motion.path
            d={`M ${100 - baseWidth/4} ${75 + baseHeight/3} 
                Q ${100 - baseWidth/2} ${75 + baseHeight/2 + 10} 
                  ${100 - baseWidth/2 - 5} ${75 + baseHeight/2 + 20}`}
            stroke={color}
            strokeWidth={2 * frontLegProgress}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 右前腿 */}
          <motion.path
            d={`M ${100 + baseWidth/4} ${75 + baseHeight/3} 
                Q ${100 + baseWidth/2} ${75 + baseHeight/2 + 10} 
                  ${100 + baseWidth/2 + 5} ${75 + baseHeight/2 + 20}`}
            stroke={color}
            strokeWidth={2 * frontLegProgress}
            fill="none"
            strokeLinecap="round"
          />
        </motion.g>
      )}
      
    </motion.svg>
  );
};

/**
 * 水生环境指示器
 */
const EnvironmentIndicators: React.FC<{
  environment: WaterEnvironment;
}> = ({ environment }) => {
  const getTempStatus = (temp: number) => {
    if (temp < 18) return { label: 'warning', icon: '❄️' };
    if (temp > 28) return { label: 'warning', icon: '🌡️' };
    return { label: 'normal', icon: '🌊' };
  };
  
  const getOxygenStatus = (oxygen: number) => {
    if (oxygen < 40) return { label: 'danger', icon: '💀' };
    if (oxygen < 60) return { label: 'warning', icon: '⚠️' };
    return { label: 'normal', icon: '💨' };
  };
  
  const getCleanlinessStatus = (cleanliness: number) => {
    if (cleanliness < 40) return { label: 'danger', icon: '�' };
    if (cleanliness < 60) return { label: 'warning', icon: '😷' };
    return { label: 'normal', icon: '✨' };
  };
  
  const tempStatus = getTempStatus(environment.temperature);
  const oxygenStatus = getOxygenStatus(environment.oxygen);
  const cleanlinessStatus = getCleanlinessStatus(environment.cleanliness);
  
  return (
    <div className="environment-panel">
      <div className={`env-indicator ${tempStatus.label}`}>
        <span className="icon">{tempStatus.icon}</span>
        <span className="label">温度</span>
        <span className="value">{environment.temperature}°C</span>
      </div>
      <div className={`env-indicator ${oxygenStatus.label}`}>
        <span className="icon">{oxygenStatus.icon}</span>
        <span className="label">氧气</span>
        <span className="value">{environment.oxygen}%</span>
      </div>
      <div className={`env-indicator ${cleanlinessStatus.label}`}>
        <span className="icon">{cleanlinessStatus.icon}</span>
        <span className="label">水质</span>
        <span className="value">{environment.cleanliness}%</span>
      </div>
      <div className="env-indicator">
        <span className="icon">🏊</span>
        <span className="label">流速</span>
        <span className="value">{environment.flowSpeed.toFixed(1)}</span>
      </div>
    </div>
  );
};

/**
 * 变态发育进度面板
 */
const MetamorphosisPanel: React.FC<{
  currentStage: TadpoleStage;
  growth: number;
}> = ({ currentStage, growth }) => {
  const stages: TadpoleStage[] = ['newly_hatched', 'early', 'mid', 'late', 'pre_frog'];
  
  return (
    <div className="metamorphosis-panel">
      <h4>变态发育进度</h4>
      <div className="metamorphosis-stages">
        {stages.map((stage, index) => {
          const isCompleted = stages.indexOf(currentStage) > index;
          const isActive = stage === currentStage;
          
          return (
            <div key={stage} className={`stage-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
              <div className="stage-dot" />
              <span>{STAGE_CONFIG[stage].label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#999' }}>
        {STAGE_CONFIG[currentStage].description}
      </div>
    </div>
  );
};

/**
 * 成长进度条
 */
const GrowthBar: React.FC<{ growth: number }> = ({ growth }) => {
  return (
    <div className="growth-bar">
      <span className="label">成长</span>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${growth}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="value">{Math.round(growth)}%</span>
    </div>
  );
};

// ==================== 主组件 ====================

export const Tadpole: React.FC<TadpoleProps> = ({
  stage,
  features,
  environment,
  growth,
  isEating = false,
  isMoving = true,
  direction = 'right',
  onEnvironmentChange,
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<'left' | 'right'>(direction);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 自动换向
  useEffect(() => {
    if (isMoving && mounted) {
      const interval = setInterval(() => {
        setCurrentDirection(prev => prev === 'left' ? 'right' : 'left');
      }, 3000 + Math.random() * 2000);
      
      return () => clearInterval(interval);
    }
  }, [isMoving, mounted]);
  
  // 环境影响计算
  const getEnvironmentHealth = useMemo(() => {
    let health = 100;
    
    // 温度影响
    if (environment.temperature < 18 || environment.temperature > 28) {
      health -= 20;
    }
    
    // 氧气影响
    if (environment.oxygen < 60) {
      health -= 25;
    }
    
    // 水质影响
    if (environment.cleanliness < 60) {
      health -= 20;
    }
    
    return Math.max(0, health);
  }, [environment]);
  
  return (
    <div className={`tadpole-container ${className}`}>
      {/* 水波纹背景 */}
      <WaterRipples 
        count={5} 
        flowSpeed={Math.max(1, environment.flowSpeed)} 
      />
      
      {/* 蝌蚪身体 */}
      <motion.div
        className="tadpole-body-container"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <TadpoleBody
          features={features}
          stage={stage}
          isSwimming={isMoving && !isEating}
          direction={currentDirection}
        />
      </motion.div>
      
      {/* UI 覆盖层 */}
      {mounted && (
        <>
          {/* 成长进度 */}
          <GrowthBar growth={growth} />
          
          {/* 变态发育面板 */}
          <MetamorphosisPanel 
            currentStage={stage}
            growth={growth}
          />
          
          {/* 环境指示器 */}
          <EnvironmentIndicators environment={environment} />
        </>
      )}
    </div>
  );
};

export default Tadpole;
