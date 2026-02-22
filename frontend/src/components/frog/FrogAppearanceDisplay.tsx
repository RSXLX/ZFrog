/**
 * 青蛙外观展示组件
 * 
 * 用于详情页展示青蛙的个性化外观
 * 如果青蛙有外观参数则显示参数化 SVG，否则显示默认青蛙
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FrogSvgGenerated } from './FrogSvgGenerated';
import { RarityBorder } from './RarityBorder';
import { 
  FrogAppearanceParams, 
  getAppearance, 
  getRarityDisplayText, 
  getRarityColor 
} from '../../services/appearance.api';

interface FrogAppearanceDisplayProps {
  tokenId: number;
  frogName: string;
  size?: number;
  showDetails?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

export const FrogAppearanceDisplay: React.FC<FrogAppearanceDisplayProps> = ({
  tokenId,
  frogName,
  size = 200,
  showDetails = true,
  className = '',
  fallback,
}) => {
  const [params, setParams] = useState<FrogAppearanceParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppearance = async () => {
      try {
        setIsLoading(true);
        const response = await getAppearance(tokenId);
        if (response.success && response.params) {
          setParams(response.params);
        }
      } catch (err) {
        console.error('Failed to fetch appearance:', err);
        setError('无法加载外观');
      } finally {
        setIsLoading(false);
      }
    };

    if (tokenId > 0) {
      fetchAppearance();
    }
  }, [tokenId]);

  // 加载中
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="animate-pulse bg-gray-700 rounded-xl" style={{ width: size * 0.8, height: size * 0.8 }} />
      </div>
    );
  }

  // 无外观参数，使用降级组件
  if (!params) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div 
          className="bg-gray-800 rounded-xl flex items-center justify-center text-6xl"
          style={{ width: size, height: size }}
        >
          🐸
        </div>
        {showDetails && (
          <p className="text-gray-400 text-sm mt-2">{frogName}</p>
        )}
      </div>
    );
  }

  // 有外观参数，显示个性化青蛙
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <RarityBorder 
        tier={params.rarity.tier} 
        size={size + 20}
        showLabel={showDetails}
      >
        <FrogSvgGenerated 
          params={params} 
          size={size - 20} 
          animated={true}
        />
      </RarityBorder>

      {showDetails && (
        <motion.div 
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-bold text-white">{frogName}</h3>
          
          {/* 稀有度 */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span 
              className="text-sm font-medium"
              style={{ color: getRarityColor(params.rarity.tier) }}
            >
              {getRarityDisplayText(params.rarity.tier)}
            </span>
            <span className="text-gray-500 text-xs">
              (分数: {params.rarity.score})
            </span>
          </div>

          {/* 描述 */}
          {params.description && (
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              "{params.description}"
            </p>
          )}

          {/* 配件标签 */}
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {params.accessories.hat !== 'none' && (
              <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                🎩 {params.accessories.hat}
              </span>
            )}
            {params.accessories.glasses !== 'none' && (
              <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                👓 {params.accessories.glasses}
              </span>
            )}
            {params.effects.sparkle && (
              <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                ✨ 闪亮
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FrogAppearanceDisplay;
