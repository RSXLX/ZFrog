// frontend/src/components/travel/CrossChainBridgeAnimation.tsx
// 跨链桥动画组件 - 显示青蛙穿越彩虹桥的动画效果

import { motion } from 'framer-motion';
import './CrossChainBridgeAnimation.css';

interface BridgeAnimationProps {
  stage: 'LOCKING' | 'CROSSING_OUT' | 'ON_TARGET_CHAIN' | 'CROSSING_BACK' | 'COMPLETED';
  sourceChain: string;
  targetChain: string;
  progress?: number; // 0-100
}

// 链配置
const CHAIN_CONFIG: Record<string, { icon: string; color: string }> = {
  'ZetaChain': { icon: '⚡', color: '#00d395' },
  'BSC Testnet': { icon: '🔶', color: '#f0b90b' },
  'Sepolia': { icon: '💎', color: '#627eea' },
  'Ethereum': { icon: '💎', color: '#627eea' },
  'Polygon': { icon: '🟣', color: '#8247e5' },
};

export function CrossChainBridgeAnimation({ 
  stage, 
  sourceChain, 
  targetChain,
  progress = 0 
}: BridgeAnimationProps) {
  const sourceConfig = CHAIN_CONFIG[sourceChain] || CHAIN_CONFIG['ZetaChain'];
  const targetConfig = CHAIN_CONFIG[targetChain] || CHAIN_CONFIG['BSC Testnet'];
  
  // 根据阶段计算青蛙位置
  const getFrogPosition = () => {
    switch (stage) {
      case 'LOCKING':
        return 0;
      case 'CROSSING_OUT':
        return progress * 0.5; // 0-50%
      case 'ON_TARGET_CHAIN':
        return 50 + (progress * 0.3); // 50-80%
      case 'CROSSING_BACK':
        return 80 + (progress * 0.2); // 80-100%
      case 'COMPLETED':
        return 100;
      default:
        return 0;
    }
  };
  
  const frogPosition = getFrogPosition();
  const isExploring = stage === 'ON_TARGET_CHAIN';
  const isCrossing = stage === 'CROSSING_OUT' || stage === 'CROSSING_BACK';
  
  return (
    <div className="bridge-animation-container">
      {/* 源链节点 */}
      <div className="chain-node source" style={{ borderColor: sourceConfig.color }}>
        <span className="chain-icon">{sourceConfig.icon}</span>
        <span className="chain-name">{sourceChain}</span>
        {stage === 'LOCKING' && (
          <motion.div 
            className="locking-indicator"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🔒 锁定中...
          </motion.div>
        )}
      </div>
      
      {/* 彩虹桥路径 */}
      <div className="bridge-path">
        {/* 彩虹桥背景 */}
        <div className={`rainbow-bridge ${isCrossing ? 'active' : ''}`}>
          <div className="bridge-glow"></div>
        </div>
        
        {/* 进度轨道 */}
        <div className="bridge-track">
          <div 
            className="bridge-progress" 
            style={{ width: `${frogPosition}%` }}
          />
        </div>
        
        {/* 青蛙旅行者 */}
        <motion.div 
          className={`frog-traveler ${isExploring ? 'exploring' : ''}`}
          style={{ left: `${frogPosition}%` }}
          animate={isCrossing ? {
            y: [0, -10, 0],
            rotate: stage === 'CROSSING_OUT' ? [0, 5, -5, 0] : [0, -5, 5, 0]
          } : isExploring ? {
            scale: [1, 1.1, 1],
            rotate: [0, 10, -10, 0]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🐸
          {isExploring && (
            <motion.span 
              className="exploring-indicator"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔍
            </motion.span>
          )}
        </motion.div>
        
        {/* 粒子效果 */}
        {isCrossing && (
          <div className="particle-container">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="particle"
                animate={{
                  x: [0, (i % 2 === 0 ? 1 : -1) * 20],
                  y: [-10, -30 - i * 10],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                ✨
              </motion.div>
            ))}
          </div>
        )}
        
        {/* 中间状态指示器 */}
        <div className="stage-indicator">
          {stage === 'CROSSING_OUT' && '🌈 穿越彩虹桥...'}
          {stage === 'ON_TARGET_CHAIN' && `📍 在 ${targetChain} 探索中`}
          {stage === 'CROSSING_BACK' && '🏠 返回中...'}
          {stage === 'COMPLETED' && '✅ 旅途完成!'}
        </div>
      </div>
      
      {/* 目标链节点 */}
      <div className="chain-node target" style={{ borderColor: targetConfig.color }}>
        <span className="chain-icon">{targetConfig.icon}</span>
        <span className="chain-name">{targetChain}</span>
        {stage === 'ON_TARGET_CHAIN' && (
          <motion.div 
            className="exploring-badge"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🎯 探索中
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default CrossChainBridgeAnimation;
