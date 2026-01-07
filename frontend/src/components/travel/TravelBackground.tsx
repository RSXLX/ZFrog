/**
 * 旅行场景背景组件
 * 根据目的地链显示对应的背景贴图
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { getChainBackground, CHAIN_ICONS } from '../../config/chainBackgrounds';

interface TravelBackgroundProps {
  /** 目的地链 */
  chain: string;
  /** 子元素 */
  children?: React.ReactNode;
  /** 是否显示链信息 */
  showChainInfo?: boolean;
  /** 类名 */
  className?: string;
}

export const TravelBackground = memo(function TravelBackground({
  chain,
  children,
  showChainInfo = true,
  className = '',
}: TravelBackgroundProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const bg = getChainBackground(chain);
  const chainIcon = CHAIN_ICONS[chain.toLowerCase()] || '🌐';

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
    >
      {/* 渐变背景（作为 fallback 或加载中显示） */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${bg.fallbackGradient} transition-opacity duration-500`}
        style={{ opacity: imageLoaded && !imageError ? 0.3 : 1 }}
      />
      
      {/* 贴图背景 */}
      {bg.image && !imageError && (
        <motion.img
          src={bg.image}
          alt={`${chain} landscape`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: imageLoaded ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      
      {/* 渐变遮罩（让前景内容更清晰） */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      
      {/* 链信息标签 */}
      {showChainInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 
                     backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg
                     flex items-center gap-2"
        >
          <span className="text-lg">{chainIcon}</span>
          <div>
            <div className="text-xs font-medium capitalize">{chain}</div>
            <div className="text-[10px] text-gray-500">{bg.description}</div>
          </div>
        </motion.div>
      )}
      
      {/* 动态装饰粒子 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/50 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: '110%',
              opacity: 0.3 + Math.random() * 0.4,
            }}
            animate={{ 
              y: '-10%',
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 1.5,
              ease: 'linear',
            }}
          />
        ))}
      </div>
      
      {/* 子元素 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

export default TravelBackground;
