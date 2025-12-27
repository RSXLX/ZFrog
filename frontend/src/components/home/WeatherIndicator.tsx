/**
 * 天气指示器 - 基于链上 Gas 价格显示天气
 */

import { motion } from 'framer-motion';
import { useChainMonitor } from '../../hooks/useChainMonitor';

interface WeatherIndicatorProps {
  /** 自定义 Gas 价格 (用于测试) */
  gasPrice?: bigint;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

// 天气配置
const WEATHER_CONFIG = [
  { maxGas: 20n, icon: '☀️', label: '晴天', bg: 'from-yellow-200 to-orange-200', animation: 'sunny' },
  { maxGas: 50n, icon: '⛅', label: '多云', bg: 'from-gray-200 to-blue-200', animation: 'cloudy' },
  { maxGas: 100n, icon: '🌧️', label: '下雨', bg: 'from-blue-300 to-gray-400', animation: 'rainy' },
  { maxGas: Infinity, icon: '⛈️', label: '暴风雨', bg: 'from-gray-500 to-purple-600', animation: 'stormy' },
];

const SIZE_CLASSES = {
  sm: 'w-12 h-12 text-xl',
  md: 'w-16 h-16 text-2xl',
  lg: 'w-20 h-20 text-3xl',
};

export function WeatherIndicator({ gasPrice: customGas, size = 'md' }: WeatherIndicatorProps) {
  const { gasPrice: chainGas } = useChainMonitor();
  const gasPrice = customGas ?? chainGas ?? 0n;

  // 确定天气
  const gasGwei = Number(gasPrice) / 1e9;
  const weather = WEATHER_CONFIG.find(w => BigInt(Math.floor(gasGwei)) <= w.maxGas) || WEATHER_CONFIG[3];

  // 动画变体
  const weatherAnimations = {
    sunny: {
      rotate: [0, 10, -10, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 3, repeat: Infinity }
    },
    cloudy: {
      x: [-5, 5, -5],
      transition: { duration: 4, repeat: Infinity }
    },
    rainy: {
      y: [0, 2, 0],
      transition: { duration: 0.5, repeat: Infinity }
    },
    stormy: {
      rotate: [-5, 5, -5],
      scale: [1, 1.05, 1],
      transition: { duration: 0.3, repeat: Infinity }
    },
  };

  return (
    <motion.div
      className={`relative rounded-full flex items-center justify-center 
                  bg-gradient-to-br ${weather.bg} shadow-lg cursor-pointer
                  ${SIZE_CLASSES[size]}`}
      whileHover={{ scale: 1.1 }}
      title={`${weather.label} - Gas: ${gasGwei.toFixed(1)} Gwei`}
    >
      <motion.span
        animate={weatherAnimations[weather.animation as keyof typeof weatherAnimations]}
      >
        {weather.icon}
      </motion.span>
      
      {/* 雨滴效果 */}
      {(weather.animation === 'rainy' || weather.animation === 'stormy') && (
        <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-xs opacity-50"
              initial={{ top: -10, left: `${20 + i * 15}%` }}
              animate={{ top: '100%' }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.15,
                ease: 'linear'
              }}
            >
              💧
            </motion.div>
          ))}
        </div>
      )}

      {/* 闪电效果 */}
      {weather.animation === 'stormy' && (
        <motion.div
          className="absolute -top-2 -right-2 text-lg"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 2 }}
        >
          ⚡
        </motion.div>
      )}
    </motion.div>
  );
}

export default WeatherIndicator;
