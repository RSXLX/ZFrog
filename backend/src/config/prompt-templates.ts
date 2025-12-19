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
};

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