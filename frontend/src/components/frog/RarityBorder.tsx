/**
 * 稀有度边框组件
 * 
 * 根据稀有度等级显示不同的边框样式
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RarityTier } from '../../services/appearance.api';
import './RarityBorder.css';

interface RarityBorderProps {
  tier: RarityTier;
  children: React.ReactNode;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const RARITY_CONFIG: Record<RarityTier, {
  label: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
}> = {
  common: {
    label: '普通',
    borderColor: '#9CA3AF',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    bgGradient: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
  },
  uncommon: {
    label: '稀有',
    borderColor: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    bgGradient: 'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
  },
  rare: {
    label: '珍稀',
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    bgGradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
  },
  epic: {
    label: '史诗',
    borderColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    bgGradient: 'linear-gradient(135deg, #5B21B6 0%, #4C1D95 100%)',
  },
  legendary: {
    label: '传说',
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    bgGradient: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
  },
  hidden: {
    label: '隐藏',
    borderColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    bgGradient: 'linear-gradient(135deg, #831843 0%, #4C1D95 50%, #0E7490 100%)',
  },
};

export const RarityBorder: React.FC<RarityBorderProps> = ({
  tier,
  children,
  size = 220,
  className = '',
  showLabel = true,
}) => {
  const config = RARITY_CONFIG[tier] || RARITY_CONFIG.common;
  
  return (
    <div 
      className={`rarity-border-container ${tier} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 边框装饰 */}
      <div 
        className="rarity-border-frame"
        style={{ 
          borderColor: config.borderColor,
          boxShadow: `0 0 20px ${config.glowColor}, inset 0 0 10px ${config.glowColor}`,
          background: config.bgGradient,
        }}
      >
        {/* 角落装饰 */}
        <div className="corner corner-tl" style={{ borderColor: config.borderColor }} />
        <div className="corner corner-tr" style={{ borderColor: config.borderColor }} />
        <div className="corner corner-bl" style={{ borderColor: config.borderColor }} />
        <div className="corner corner-br" style={{ borderColor: config.borderColor }} />
        
        {/* 内容区域 */}
        <div className="rarity-border-content">
          {children}
        </div>
        
        {/* 隐藏款动态边框 */}
        {tier === 'hidden' && (
          <motion.div 
            className="rainbow-border"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
      
      {/* 稀有度标签 */}
      {showLabel && (
        <div 
          className="rarity-label"
          style={{ 
            backgroundColor: config.borderColor,
            boxShadow: `0 2px 8px ${config.glowColor}`,
          }}
        >
          {tier === 'hidden' && <span className="sparkle">✨</span>}
          {config.label}
          {tier === 'hidden' && <span className="sparkle">✨</span>}
        </div>
      )}
    </div>
  );
};

export default RarityBorder;
