// ========== 家园系统类型定义 ==========

import { Frog } from './index';

// ========== 访客相关 ==========

export type VisitStatus = 'Pending' | 'Active' | 'Left' | 'Kicked' | 'Rejected';

export interface GardenVisit {
  id: number;
  hostFrogId: number;
  guestFrogId: number;
  guestFrog?: Frog;
  hostFrog?: Frog;
  status: VisitStatus;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  duration?: number; // 做客时长（分钟）
}

export interface VisitRequest {
  id: number;
  guestFrog: Frog;
  guestFrogId: number;
  hostFrogId: number;
  requestedAt: Date | string;
  giftType?: string; // 携带的礼物类型
}

// ========== 留言相关 ==========

export interface GardenMessage {
  id: number;
  gardenOwnerId: number;
  authorFrogId: number;
  authorFrog?: Frog;
  content: string;
  isQuick: boolean;
  createdAt: Date | string;
  likes: number;
  hasLiked?: boolean;
  giftType?: string; // 携带的礼物
}

export const QUICK_MESSAGES = [
  '欢迎来玩！🎉',
  '你家蛙真可爱~',
  '常来坐坐！',
  '招待不周请见谅',
  '好久不见！',
  '下次再来玩~',
] as const;

// ========== 礼物相关 ==========

export type GiftRarity = 'common' | 'rare' | 'legendary';

export interface GardenGift {
  id: string;
  type: string;
  name: string;
  emoji: string;
  friendshipPoints: number;
  rarity: GiftRarity;
  description?: string;
}

export const GARDEN_GIFTS: GardenGift[] = [
  { id: 'flower', type: 'flower', name: '小花束', emoji: '💐', friendshipPoints: 30, rarity: 'common' },
  { id: 'clover', type: 'clover', name: '幸运四叶草', emoji: '🍀', friendshipPoints: 50, rarity: 'rare', description: '可能触发惊喜！' },
  { id: 'bell', type: 'bell', name: '金色铃铛', emoji: '🔔', friendshipPoints: 100, rarity: 'legendary' },
];

// ========== 食物相关 ==========

export interface GardenFood {
  id: string;
  type: string;
  name: string;
  emoji: string;
  friendshipPoints: number;
  stock: number;
}

export const GARDEN_FOODS: Omit<GardenFood, 'stock'>[] = [
  { id: 'bug', type: 'bug', name: '普通虫子', emoji: '🐛', friendshipPoints: 10 },
  { id: 'grape', type: 'grape', name: '美味果子', emoji: '🍇', friendshipPoints: 20 },
  { id: 'cake', type: 'cake', name: '高级甜点', emoji: '🍰', friendshipPoints: 50 },
];

// ========== 装饰相关 ==========

export type DecorationCategory = 'background' | 'furniture' | 'plant' | 'souvenir' | 'special';

export interface GardenDecoration {
  id: number;
  type: string;
  category: DecorationCategory;
  name: string;
  emoji: string;
  position: { x: number; y: number };
  rotation: number;
  size: { width: number; height: number };
}

export const GARDEN_BACKGROUNDS = [
  { id: 'pond', name: '池塘', emoji: '🌿' },
  { id: 'grass', name: '草地', emoji: '🌱' },
  { id: 'night', name: '夜空', emoji: '🌙' },
  { id: 'snow', name: '雪地', emoji: '❄️' },
] as const;

// ========== 家园状态 ==========

export interface GardenState {
  ownerId: number;
  ownerFrog?: Frog;
  background: string;
  decorations: GardenDecoration[];
  currentVisitors: GardenVisit[];
  pendingRequests: VisitRequest[];
  todayVisitCount: number;
  totalVisitCount: number;
}

// ========== 友好度相关 ==========

export interface FriendshipLevel {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  unlocks: string[];
}

export const FRIENDSHIP_LEVELS: FriendshipLevel[] = [
  { level: 1, name: '初识', minXp: 0, maxXp: 200, unlocks: ['基础互动'] },
  { level: 2, name: '熟人', minXp: 200, maxXp: 500, unlocks: ['合影功能'] },
  { level: 3, name: '好友', minXp: 500, maxXp: 1000, unlocks: ['特殊留言框'] },
  { level: 4, name: '挚友', minXp: 1000, maxXp: 2000, unlocks: ['专属表情'] },
  { level: 5, name: '至交', minXp: 2000, maxXp: Infinity, unlocks: ['限定装饰'] },
];

export function getFriendshipLevel(xp: number): FriendshipLevel {
  return FRIENDSHIP_LEVELS.find(l => xp >= l.minXp && xp < l.maxXp) || FRIENDSHIP_LEVELS[0];
}

// ========== 青蛙在家园中的状态 ==========

export type GardenFrogActivity = 'idle' | 'walking' | 'exploring' | 'eating' | 'sleeping' | 'greeting' | 'waving';

export interface GardenFrogState {
  frogId: number;
  frog: Frog;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  activity: GardenFrogActivity;
  isHost: boolean;
  visitStartedAt?: Date | string;
}

// ========== WebSocket 事件类型 ==========

export interface GardenWebSocketEvents {
  // 收到访问请求
  'garden:visitRequest': (data: VisitRequest) => void;
  // 访客进入
  'garden:visitorEntered': (data: GardenVisit) => void;
  // 访客离开
  'garden:visitorLeft': (data: { visitId: number; guestFrogId: number }) => void;
  // 收到互动
  'garden:interaction': (data: { type: string; fromFrogId: number; friendshipPoints: number }) => void;
  // 收到留言
  'garden:message': (data: GardenMessage) => void;
  // 收到礼物
  'garden:gift': (data: { gift: GardenGift; fromFrog: Frog }) => void;
}

// ========== API 响应类型 ==========

export interface GardenApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

export interface VisitResponse {
  visitId: number;
  status: VisitStatus;
}

export interface InteractionResponse {
  success: boolean;
  friendshipPoints: number;
  newLevel?: FriendshipLevel;
  cooldownUntil?: Date | string;
}
