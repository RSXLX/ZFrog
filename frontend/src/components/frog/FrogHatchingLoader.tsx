/**
 * 青蛙孵化加载器
 * 
 * DNA 读取进度条设计，配合 Level 1 → Level 2 状态流转
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FrogHatchingLoader.css';

type GenerationStage = 'init' | 'reading' | 'computing' | 'generating' | 'done';

interface FrogHatchingLoaderProps {
  walletAddress: string;
  stage: GenerationStage;
  progress: number;
}

const STAGE_MESSAGES: Record<GenerationStage, string> = {
  init: '准备读取你的链上 DNA...',
  reading: '正在扫描钱包特征...',
  computing: '计算稀有度...',
  generating: '生成独特外观...',
  done: '你的专属蛙蛙已诞生！',
};

export const FrogHatchingLoader: React.FC<FrogHatchingLoaderProps> = ({
  walletAddress,
  stage,
  progress,
}) => {
  const [displayAddress, setDisplayAddress] = useState('');
  
  // 模拟 DNA 读取效果 - 逐字符显示地址
  useEffect(() => {
    if (stage === 'reading' && walletAddress) {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayAddress(walletAddress.slice(0, index + 1));
        index++;
        if (index >= walletAddress.length) {
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    } else if (stage === 'init') {
      setDisplayAddress('');
    }
  }, [stage, walletAddress]);
  
  return (
    <div className="frog-hatching-container">
      {/* 蛋壳动画 */}
      <div className="egg-container">
        <motion.div 
          className="egg-shell"
          animate={{ 
            rotateZ: stage === 'computing' ? [-2, 2, -2] : 0,
          }}
          transition={{ 
            duration: 0.3, 
            repeat: stage === 'computing' ? Infinity : 0 
          }}
        >
          <svg viewBox="0 0 100 120" className="egg-svg">
            {/* 蛋壳 */}
            <ellipse 
              cx="50" 
              cy="70" 
              rx="40" 
              ry="50" 
              fill="#FEF9C3" 
              stroke="#FCD34D" 
              strokeWidth="2" 
            />
            
            {/* 可爱的眼睛（蛋壳上） */}
            <circle cx="40" cy="60" r="5" fill="#333" />
            <circle cx="60" cy="60" r="5" fill="#333" />
            <circle cx="42" cy="58" r="1.5" fill="white" />
            <circle cx="62" cy="58" r="1.5" fill="white" />
            
            {/* 裂纹 - 随进度增加 */}
            <motion.path
              d="M 30 40 L 35 55 L 28 70 L 38 85"
              stroke="#92400E"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: progress / 100,
                opacity: progress > 20 ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
            />
            <motion.path
              d="M 70 35 L 65 50 L 72 65 L 62 80"
              stroke="#92400E"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: Math.max(0, (progress - 30) / 70),
                opacity: progress > 50 ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
            />
            
            {/* 顶部裂口 */}
            {progress > 80 && (
              <motion.path
                d="M 35 25 L 50 15 L 65 25"
                stroke="#92400E"
                strokeWidth="3"
                fill="none"
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: [-2, 2, -2] }}
                transition={{ y: { duration: 0.5, repeat: Infinity } }}
              />
            )}
          </svg>
        </motion.div>
      </div>
      
      {/* DNA 读取显示 */}
      <div className="dna-display">
        <div className="dna-label">🧬 DNA Seed</div>
        <div className="dna-address">
          <code>
            {displayAddress || '0x...'}
            <motion.span
              className="cursor"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              _
            </motion.span>
          </code>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="progress-container">
        <div className="progress-bar">
          <motion.div 
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="progress-text">{progress}%</div>
      </div>
      
      {/* 阶段提示文字 */}
      <AnimatePresence mode="wait">
        <motion.p 
          key={stage}
          className="stage-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {STAGE_MESSAGES[stage]}
        </motion.p>
      </AnimatePresence>
      
      {/* Level 指示器 */}
      <div className="level-indicator">
        <div className={`level ${progress >= 0 ? 'active' : ''}`}>
          <span className="level-icon">⚙️</span>
          <span className="level-text">规则计算</span>
        </div>
        <div className="level-connector" />
        <div className={`level ${progress >= 60 ? 'active' : ''}`}>
          <span className="level-icon">🤖</span>
          <span className="level-text">AI 润色</span>
        </div>
      </div>
    </div>
  );
};

export default FrogHatchingLoader;
