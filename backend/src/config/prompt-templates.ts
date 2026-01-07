/**
 * ZetaFrog 提示词构建系统
 * 
 * 设计原则：
 * 1. 统一品牌风格 - 卡通、可爱、明亮
 * 2. 突出跨链主题 - 区块链元素
 * 3. 稀有度区分 - 视觉复杂度递增
 */

// 基础风格前缀（所有图片共用）
export const STYLE_PREFIX = `
cute kawaii cartoon style, 
chibi frog character,
soft rounded shapes,
bright vibrant colors,
clean digital illustration,
transparent background,
high quality, 4K detailed
`.trim().replace(/\s+/g, ' ');

// 负面提示词（避免生成不良内容）
export const NEGATIVE_PROMPT = `
realistic, photorealistic, 3d render,
dark, gloomy, scary, horror,
blurry, low quality, distorted,
text, watermark, signature,
bad anatomy, deformed,
multiple frogs, crowded
`.trim().replace(/\s+/g, ' ');

// 纪念品类型配置
export const SOUVENIR_PROMPTS: Record<string, SouvenirPromptConfig> = {
  ETHEREUM_POSTCARD: {
    name: 'Ethereum Postcard',
    nameZh: '以太坊明信片',
    basePrompt: 'vintage postcard design, Ethereum diamond logo, blockchain network background, stamp corner decoration',
    colors: 'purple and blue gradient, silver accents',
    rarityEnhance: {
      COMMON: 'simple flat design',
      UNCOMMON: 'subtle glow effects, soft shadows',
      RARE: 'holographic shimmer, metallic accents',
      EPIC: 'golden frame, aurora glow, sparkles',
      LEGENDARY: 'rainbow holographic, crystal elements, divine light rays',
    }
  },

  GAS_FEE_RECEIPT: {
    name: 'Gas Fee Receipt',
    nameZh: 'Gas费收据',
    basePrompt: 'paper receipt design, gas pump icon, transaction data display, crypto symbols',
    colors: 'warm yellow and orange, white paper texture',
    rarityEnhance: {
      COMMON: 'basic receipt paper',
      UNCOMMON: 'decorated borders, cute doodles',
      RARE: 'golden seal stamp, premium paper texture',
      EPIC: 'holographic receipt, glowing numbers',
      LEGENDARY: 'mythical scroll, floating in gas clouds, cosmic energy',
    }
  },

  BLOCKCHAIN_SNOWGLOBE: {
    name: 'Blockchain Snowglobe',
    nameZh: '区块链水晶球',
    basePrompt: 'magical snow globe, miniature blockchain city inside, digital snowflakes falling, glowing base',
    colors: 'crystal blue, white sparkles, soft purple glow',
    rarityEnhance: {
      COMMON: 'simple glass sphere, basic scene',
      UNCOMMON: 'animated snow particles, multiple buildings',
      RARE: 'magical aurora inside, floating crypto symbols',
      EPIC: 'enchanted globe, swirling energy vortex',
      LEGENDARY: 'cosmic globe, entire universe inside, rainbow nebula',
    }
  },

  CRYPTO_STAMP: {
    name: 'Crypto Stamp',
    nameZh: '加密邮票',
    basePrompt: 'collectible postage stamp, perforated edges, denomination value, blockchain themed artwork',
    colors: 'vintage sepia, royal purple, gold foil',
    rarityEnhance: {
      COMMON: 'standard stamp design',
      UNCOMMON: 'commemorative edition mark',
      RARE: 'metallic foil printing, embossed details',
      EPIC: 'holographic stamp, 3D depth effect',
      LEGENDARY: 'animated elements, ultra-rare limited edition',
    }
  },

  CHAIN_COMPASS: {
    name: 'Chain Compass',
    nameZh: '链上指南针',
    basePrompt: 'magical compass, ornate design, multiple chain indicators, glowing needle, map background',
    colors: 'brass gold, deep blue, emerald green',
    rarityEnhance: {
      COMMON: 'basic wooden compass',
      UNCOMMON: 'brass compass with engravings',
      RARE: 'golden compass, gem-studded face',
      EPIC: 'magical floating holographic display',
      LEGENDARY: 'ancient artifact, reality-bending effects, cosmic symbols',
    }
  },

  DEFI_TREASURE_MAP: {
    name: 'DeFi Treasure Map',
    nameZh: 'DeFi藏宝图',
    basePrompt: 'ancient treasure map, aged parchment paper, protocol landmarks, yield farming spots, X marks the spot',
    colors: 'parchment brown, ink black, gold highlights, red X',
    rarityEnhance: {
      COMMON: 'simple hand-drawn routes',
      UNCOMMON: 'multiple treasure locations, detailed paths',
      RARE: 'hidden secrets revealed, glowing trails',
      EPIC: 'animated path indicators, magical symbols',
      LEGENDARY: 'legendary map showing all DeFi treasures, cosmic overlay',
    }
  },

  NFT_POLAROID: {
    name: 'NFT Polaroid',
    nameZh: 'NFT拍立得',
    basePrompt: 'Polaroid instant photo, white frame, captured crypto moment, handwritten caption, date stamp',
    colors: 'white frame, vibrant photo colors, vintage filter',
    rarityEnhance: {
      COMMON: 'standard polaroid',
      UNCOMMON: 'special filter effects, color enhancement',
      RARE: 'golden frame, memorable scene',
      EPIC: 'animated living memory, sparkle effects',
      LEGENDARY: 'multidimensional showing parallel realities, cosmic frame',
    }
  },

  SMART_CONTRACT_SCROLL: {
    name: 'Smart Contract Scroll',
    nameZh: '智能合约卷轴',
    basePrompt: 'ancient scroll, rolled parchment, glowing code text, magical seals, contract symbols',
    colors: 'ancient gold, magical blue glow, code green',
    rarityEnhance: {
      COMMON: 'basic scroll with code snippets',
      UNCOMMON: 'decorated scroll, syntax highlighting',
      RARE: 'enchanted scroll, animated code',
      EPIC: 'powerful scroll, reality-altering runes',
      LEGENDARY: 'primordial scroll, genesis contract, divine light',
    }
  },

  CROSS_CHAIN_PORTAL: {
    name: 'Cross-chain Portal',
    nameZh: '跨链传送门',
    basePrompt: 'mystical portal, swirling energy vortex, chain symbols around, dimensional rift, energy streams',
    colors: 'void purple, energy cyan, portal orange, star white',
    rarityEnhance: {
      COMMON: 'small portal, single destination',
      UNCOMMON: 'medium portal, multiple chain connections',
      RARE: 'large stable wormhole, bright energy',
      EPIC: 'massive portal, cosmic energy flow',
      LEGENDARY: 'ultimate portal connecting all realities, rainbow cosmic energy',
    }
  },
};

// 结伴旅行提示词配置
export const GROUP_TRAVEL_PROMPTS: Record<string, SouvenirPromptConfig> = {
  TWO_FROGS_ADVENTURE: {
    name: 'Two Frogs Adventure',
    nameZh: '双蛙冒险',
    basePrompt: 'two cute cartoon frogs traveling together, wearing matching small backpacks, holding hands or hopping together, adventure companions, friendship theme, scenic blockchain landscape background',
    colors: 'bright green frogs, colorful backpacks, warm sunset colors',
    rarityEnhance: {
      COMMON: 'simple background, basic style, peaceful meadow',
      UNCOMMON: 'scenic path, flowers and butterflies, happy expressions',
      RARE: 'magical forest, glowing fireflies, rainbow bridge, sparkling effects',
      EPIC: 'floating islands, aurora sky, sparkling trail, treasure chest',
      LEGENDARY: 'cosmic adventure, galaxy background, legendary companions, divine light, epic journey',
    }
  },
  TWO_FROGS_PHOTO: {
    name: 'Two Frogs Photo',
    nameZh: '双蛙合照',
    basePrompt: 'polaroid photo of two cute cartoon frogs posing together, friendship selfie, victory sign, happy smiles, white polaroid frame',
    colors: 'warm filters, vintage colors, soft glow',
    rarityEnhance: {
      COMMON: 'simple pose, basic background',
      UNCOMMON: 'landmark in background, cute stickers',
      RARE: 'famous destination, hearts and sparkles',
      EPIC: 'magical moment, animated effects',
      LEGENDARY: 'once in a lifetime shot, rainbow effects, legendary landmark',
    }
  },
};

// 链主题配置
export const CHAIN_THEMES: Record<number, ChainTheme> = {
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    colors: 'purple and blue, silver diamond',
    elements: 'Ethereum diamond logo, purple energy waves',
  },
  56: {
    name: 'BNB Chain',
    symbol: 'BNB',
    colors: 'golden yellow, warm orange',
    elements: 'BNB coin, golden glow',
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    colors: 'purple gradient, violet',
    elements: 'polygon shapes, purple energy',
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    colors: 'blue, clean white',
    elements: 'Base logo, minimalist design',
  },
  7001: {
    name: 'ZetaChain',
    symbol: 'ZETA',
    colors: 'green and teal, omnichain glow',
    elements: 'Zeta symbol, cross-chain bridges, universal connection',
  },
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    colors: 'golden yellow, warm orange',
    elements: 'BNB coin, test network badge',
  },
  11155111: {
    name: 'Sepolia',
    symbol: 'SepoliaETH',
    colors: 'light purple, silver',
    elements: 'Ethereum diamond, testnet indicator',
  },
};

// 跨链探索观察模板
export const EXPLORATION_OBSERVATION_PROMPTS = {
  // 发现合约
  contract_discovery: [
    '🏛️ 发现了一座神秘的合约建筑！代码闪烁着智慧的光芒。',
    '📜 路过一个繁忙的智能合约，里面有很多有趣的函数。',
    '🏗️ 遇到了一个正在施工的合约地址，开发者正在努力建设。',
    '🏰 发现了一座古老的合约城堡，已经处理了无数交易。',
    '🔮 看到一个充满魔力的合约，能量在代码中流动。',
  ],
  
  // 发现空地址
  empty_address: [
    '🏜️ 来到一片荒野地址，这里还没有任何故事。',
    '🌌 漂浮在地址空间中，周围一片寂静。',
    '🚪 发现了一个空置的地址房间，主人可能外出旅行了。',
    '🌾 路过一块未开发的地址草地，充满可能性。',
  ],
  
  // DEX相关
  dex_observation: [
    '💱 发现了热闹的交易市场！代币们在这里交换着。',
    '🏊 拜访了一个流动性池，LP们正在愉快地提供服务。',
    '📊 观察到大量的swap交易，价格曲线在跳动。',
  ],
  
  // NFT相关
  nft_observation: [
    '🎨 发现了一个NFT画廊，里面挂满了数字艺术品。',
    '🖼️ 路过一个收藏家的地址，各种稀有NFT琳琅满目。',
    '🃏 遇到了一个NFT项目，小图片们正在开派对。',
  ],
  
  // 路过大户
  whale_encounter: [
    '🐋 远远看到一只巨鲸的地址，太壮观了！',
    '💎 发现了一个鲸鱼的豪宅，余额数字闪闪发光。',
    '🌊 感觉到巨大的资金波动，一定是大户在活动。',
  ],
  
  // 随机事件
  random_events: [
    '✨ 突然看到一道闪光，是一笔刚确认的交易！',
    '🌈 遇到了一条彩虹桥，连接着不同的协议。',
    '🔔 听到了区块确认的声音，链在稳定运行。',
    '⚡ 感受到Gas价格的波动，网络变得繁忙了。',
    '🍀 发现了一个幸运数字结尾的地址！',
  ],
};

// 根据探索类型获取随机观察文本
export function getRandomObservation(type: keyof typeof EXPLORATION_OBSERVATION_PROMPTS): string {
  const templates = EXPLORATION_OBSERVATION_PROMPTS[type];
  return templates[Math.floor(Math.random() * templates.length)];
}

// 类型定义
interface SouvenirPromptConfig {
  name: string;
  nameZh: string;
  basePrompt: string;
  colors: string;
  rarityEnhance: Record<string, string>;
}

interface ChainTheme {
  name: string;
  symbol: string;
  colors: string;
  elements: string;
}

export type { SouvenirPromptConfig, ChainTheme };