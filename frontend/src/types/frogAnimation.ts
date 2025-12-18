export enum FrogState {
  // 基础状态
  IDLE = 'idle',              // 待机 - 正常呼吸
  SLEEPING = 'sleeping',      // 睡觉 - ZZZ
  EATING = 'eating',          // 吃东西
  WALKING = 'walking',        // 走路
  JUMPING = 'jumping',        // 跳跃
  
  // 旅行状态
  TRAVELING = 'traveling',    // 旅行中 - 带小背包
  RETURNING = 'returning',    // 返程 - 带纪念品
  WRITING = 'writing',        // 写日记
  
  // 链上事件反应
  EXCITED = 'excited',        // 兴奋 - 大单买入
  SCARED = 'scared',          // 害怕 - 大单卖出/暴跌
  RICH = 'rich',              // 发财 - 巨鲸交易
  CURIOUS = 'curious',        // 好奇 - 新项目
  DANCING = 'dancing',        // 跳舞 - 行情大涨
  CRYING = 'crying',          // 哭泣 - 行情暴跌
  
  // 互动状态
  HAPPY = 'happy',            // 开心 - 被抚摸
  ANGRY = 'angry',            // 生气 - 被戳太多次
  LOVE = 'love',              // 爱心 - 被喂食
  THINKING = 'thinking',      // 思考 - 等待用户操作
}

export enum FrogMood {
  VERY_HAPPY = 'very_happy',
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  VERY_SAD = 'very_sad',
}

export interface FrogAnimationState {
  currentState: FrogState;
  mood: FrogMood;
  energy: number;          // 0-100 精力值
  hunger: number;          // 0-100 饥饿值
  happiness: number;       // 0-100 快乐值
  lastInteraction: number; // 上次互动时间
  position: { x: number; y: number };
  direction: 'left' | 'right';
}

export interface AnimationConfig {
  frames: number;
  duration: number;
  loop: boolean;
  sprites: string[];
  particles: string | null;
  sound: string | null;
}

export interface ParticleConfig {
  emoji: string;
  count: number;
  duration: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'burst';
  spread: number;
}

export interface ChainEvent {
  type: 'large_buy' | 'large_sell' | 'whale_transfer' | 'new_listing' | 'price_change';
  token: string;
  value: number;
  from?: string;
  to?: string;
  timestamp: number;
  txHash?: string;
}

export interface WhaleAlert {
  address: string;
  amount: number;
  token: string;
  direction: 'in' | 'out';
  timestamp: number;
}

export interface ChainMonitorState {
  latestEvent: ChainEvent | null;
  priceChange: number;
  whaleAlert: WhaleAlert | null;
  gasPrice: bigint;
  isConnected: boolean;
  events: ChainEvent[];
}

export interface InteractionStats {
  totalClicks: number;
  totalPets: number;
  totalFeeds: number;
  totalTravels: number;
  lastInteraction: number;
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  energy: number;
  happiness: number;
}

export interface FrogData {
  id: number;
  name: string;
  status: FrogState;
  mood: FrogMood;
  energy: number;
  hunger: number;
  happiness: number;
  owner: string;
  createdAt: number;
  lastInteraction: number;
}