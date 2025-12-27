/**
 * 旅行背景贴图管理
 * 根据目的地链显示对应的风景背景
 */

// 链背景配置
export const CHAIN_BACKGROUNDS: Record<string, {
  image: string;
  fallbackGradient: string;
  description: string;
}> = {
  ethereum: {
    image: '/assets/backgrounds/ethereum.png',
    fallbackGradient: 'from-purple-900 via-indigo-800 to-blue-900',
    description: '雪山极光',
  },
  bsc: {
    image: '/assets/backgrounds/bsc.png',
    fallbackGradient: 'from-amber-600 via-orange-500 to-yellow-400',
    description: '热带丛林',
  },
  polygon: {
    image: '/assets/backgrounds/polygon.png',
    fallbackGradient: 'from-purple-700 via-violet-600 to-indigo-500',
    description: '海洋城市',
  },
  zetachain: {
    image: '/assets/backgrounds/zetachain.png',
    fallbackGradient: 'from-emerald-600 via-teal-500 to-cyan-400',
    description: '跨链枢纽',
  },
  arbitrum: {
    image: '/assets/backgrounds/arbitrum.png',
    fallbackGradient: 'from-blue-800 via-blue-600 to-sky-500',
    description: '蓝色迷宫',
  },
  optimism: {
    image: '/assets/backgrounds/optimism.png',
    fallbackGradient: 'from-red-600 via-rose-500 to-pink-400',
    description: '乐观之城',
  },
};

// 获取链背景
export function getChainBackground(chain: string) {
  const lowerChain = chain.toLowerCase();
  return CHAIN_BACKGROUNDS[lowerChain] || {
    image: '',
    fallbackGradient: 'from-gray-700 via-gray-600 to-gray-500',
    description: '未知领域',
  };
}

// 链图标
export const CHAIN_ICONS: Record<string, string> = {
  ethereum: '⟠',
  bsc: '🟡',
  polygon: '🟣',
  zetachain: '🟢',
  arbitrum: '🔵',
  optimism: '🔴',
};
