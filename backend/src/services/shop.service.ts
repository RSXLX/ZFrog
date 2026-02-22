/**
 * 🐸 宠物蛋系统 - 商店服务
 * 模块F.3: 商店系统
 */

import { prisma } from '../database';
import { ShopCategory } from '@prisma/client';

// 初始商品数据
export const DEFAULT_SHOP_ITEMS = [
  // 食物区
  {
    name: '面包',
    description: '普通食物，增加 15 点饱食度',
    category: 'FOOD' as ShopCategory,
    priceLily: 10,
    effect: 'hunger',
    effectValue: 15,
    icon: '🍞',
    requiredLevel: 1,
  },
  {
    name: '虫子便当',
    description: '营养丰富，增加 25 点饱食度和 5 点能量',
    category: 'FOOD' as ShopCategory,
    priceLily: 25,
    effect: 'hunger_energy',
    effectValue: 25,
    icon: '🍱',
    requiredLevel: 1,
  },
  {
    name: '蛋糕',
    description: '甜蜜点心，增加 20 点幸福度',
    category: 'FOOD' as ShopCategory,
    priceLily: 30,
    effect: 'happiness',
    effectValue: 20,
    icon: '🍰',
    requiredLevel: 1,
  },
  {
    name: '糖果',
    description: '小零食，增加 10 点幸福度',
    category: 'FOOD' as ShopCategory,
    priceLily: 15,
    effect: 'happiness',
    effectValue: 10,
    icon: '🍬',
    requiredLevel: 2,
  },
  {
    name: '能量饮料',
    description: '快速恢复 30 点活力值',
    category: 'FOOD' as ShopCategory,
    priceLily: 40,
    effect: 'energy',
    effectValue: 30,
    icon: '🥤',
    requiredLevel: 3,
  },
  
  // 药品区
  {
    name: '普通药水',
    description: '恢复 50 点健康度',
    category: 'MEDICINE' as ShopCategory,
    priceLily: 50,
    effect: 'health',
    effectValue: 50,
    icon: '💊',
    requiredLevel: 1,
  },
  {
    name: '高级药水',
    description: '恢复 80 点健康度并治愈疾病',
    category: 'MEDICINE' as ShopCategory,
    priceLily: 100,
    effect: 'health_cure',
    effectValue: 80,
    icon: '💉',
    requiredLevel: 5,
  },
  {
    name: '营养剂',
    description: '全属性恢复 20 点',
    category: 'MEDICINE' as ShopCategory,
    priceLily: 80,
    effect: 'all_stats',
    effectValue: 20,
    icon: '🧪',
    requiredLevel: 8,
  },
  
  // 增益道具
  {
    name: '幸运草',
    description: '下次旅行获得双倍奖励',
    category: 'BOOST' as ShopCategory,
    priceLily: 200,
    effect: 'lucky_travel',
    effectValue: 2,
    icon: '🍀',
    requiredLevel: 5,
  },
  {
    name: '加速卡',
    description: '旅行时间减少 30%',
    category: 'BOOST' as ShopCategory,
    priceLily: 150,
    effect: 'speed_travel',
    effectValue: 30,
    icon: '⏱️',
    requiredLevel: 7,
  },
];

export interface ShopItemInfo {
  id: number;
  name: string;
  description: string | null;
  category: ShopCategory;
  priceLily: number;
  priceZeta: number;
  effect: string | null;
  effectValue: number;
  icon: string | null;
  requiredLevel: number;
  isLimited: boolean;
  canBuy: boolean;
  reason?: string;
}

/**
 * 初始化商店（种子数据）
 */
export async function initializeShop(): Promise<void> {
  const existingCount = await prisma.shopItem.count();
  if (existingCount > 0) {
    console.log('[Shop] 商店已初始化，跳过');
    return;
  }

  console.log('[Shop] 初始化商店商品...');
  
  for (const item of DEFAULT_SHOP_ITEMS) {
    await prisma.shopItem.create({
      data: {
        name: item.name,
        description: item.description,
        category: item.category,
        priceLily: item.priceLily,
        priceZeta: 0,
        effect: item.effect,
        effectValue: item.effectValue,
        icon: item.icon,
        requiredLevel: item.requiredLevel,
        isActive: true,
        isLimited: false,
      },
    });
  }

  console.log(`[Shop] 已创建 ${DEFAULT_SHOP_ITEMS.length} 个商品`);
}

/**
 * 获取商店商品列表
 */
export async function getShopItems(
  ownerAddress: string,
  category?: ShopCategory
): Promise<ShopItemInfo[]> {
  // 获取用户的青蛙等级
  const frog = await prisma.frog.findFirst({
    where: { ownerAddress: ownerAddress.toLowerCase() },
    select: { level: true },
  });
  const userLevel = frog?.level ?? 1;

  // 获取用户余额
  const balance = await prisma.lilyBalance.findUnique({
    where: { ownerAddress: ownerAddress.toLowerCase() },
    select: { balance: true },
  });
  const userBalance = balance?.balance ?? 0;

  // 查询商品
  const where: any = { isActive: true };
  if (category) {
    where.category = category;
  }

  const items = await prisma.shopItem.findMany({
    where,
    orderBy: [
      { category: 'asc' },
      { requiredLevel: 'asc' },
      { priceLily: 'asc' },
    ],
  });

  return items.map(item => {
    let canBuy = true;
    let reason: string | undefined;

    if (item.requiredLevel > userLevel) {
      canBuy = false;
      reason = `需要等级 ${item.requiredLevel}`;
    } else if (item.priceLily > userBalance) {
      canBuy = false;
      reason = '余额不足';
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      priceLily: item.priceLily,
      priceZeta: item.priceZeta,
      effect: item.effect,
      effectValue: item.effectValue,
      icon: item.icon,
      requiredLevel: item.requiredLevel,
      isLimited: item.isLimited,
      canBuy,
      reason,
    };
  });
}

/**
 * 购买商品
 */
export async function purchaseItem(
  ownerAddress: string,
  itemId: number
): Promise<{ success: boolean; item?: ShopItemInfo; newBalance?: number; error?: string }> {
  // 获取商品
  const item = await prisma.shopItem.findUnique({
    where: { id: itemId },
  });

  if (!item || !item.isActive) {
    return { success: false, error: '商品不存在或已下架' };
  }

  // 获取用户青蛙
  const frog = await prisma.frog.findFirst({
    where: { ownerAddress: ownerAddress.toLowerCase() },
    select: { id: true, level: true },
  });

  if (!frog) {
    return { success: false, error: '未找到青蛙' };
  }

  // 检查等级要求
  if (item.requiredLevel > (frog.level ?? 1)) {
    return { success: false, error: `需要等级 ${item.requiredLevel}` };
  }

  // 检查余额
  const balance = await prisma.lilyBalance.findUnique({
    where: { ownerAddress: ownerAddress.toLowerCase() },
  });

  if (!balance || balance.balance < item.priceLily) {
    return { success: false, error: '$LILY 余额不足' };
  }

  // 扣除余额
  const updatedBalance = await prisma.lilyBalance.update({
    where: { ownerAddress: ownerAddress.toLowerCase() },
    data: {
      balance: { decrement: item.priceLily },
      totalSpent: { increment: item.priceLily },
    },
  });

  // 记录交易
  await prisma.lilyTransaction.create({
    data: {
      ownerAddress: ownerAddress.toLowerCase(),
      amount: -item.priceLily,
      type: 'SHOP_PURCHASE',
      description: `购买 ${item.name}`,
    },
  });

  // 应用效果
  await applyItemEffect(frog.id, item.effect, item.effectValue);

  return {
    success: true,
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      priceLily: item.priceLily,
      priceZeta: item.priceZeta,
      effect: item.effect,
      effectValue: item.effectValue,
      icon: item.icon,
      requiredLevel: item.requiredLevel,
      isLimited: item.isLimited,
      canBuy: true,
    },
    newBalance: updatedBalance.balance,
  };
}

/**
 * 应用商品效果
 */
async function applyItemEffect(
  frogId: number,
  effect: string | null,
  value: number
): Promise<void> {
  if (!effect) return;

  const updateData: Record<string, any> = {};

  switch (effect) {
    case 'hunger':
      updateData.hunger = { increment: value };
      break;
    case 'hunger_energy':
      updateData.hunger = { increment: value };
      updateData.energy = { increment: Math.floor(value / 5) };
      break;
    case 'happiness':
      updateData.happiness = { increment: value };
      break;
    case 'energy':
      updateData.energy = { increment: value };
      break;
    case 'health':
      updateData.health = { increment: value };
      break;
    case 'health_cure':
      updateData.health = { increment: value };
      updateData.isSick = false;
      updateData.sickSince = null;
      break;
    case 'all_stats':
      updateData.hunger = { increment: value };
      updateData.happiness = { increment: value };
      updateData.health = { increment: value };
      updateData.energy = { increment: value };
      break;
    case 'lucky_travel':
      updateData.luckyBuff = true;
      updateData.luckyBuffExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      break;
    default:
      console.log(`[Shop] 未知效果类型: ${effect}`);
      return;
  }

  await prisma.frog.update({
    where: { id: frogId },
    data: updateData,
  });

  // 确保不超过 100
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (frog) {
    await prisma.frog.update({
      where: { id: frogId },
      data: {
        hunger: Math.min(frog.hunger, 100),
        happiness: Math.min(frog.happiness, 100),
        health: Math.min(frog.health, 100),
        energy: Math.min(frog.energy, 100),
      },
    });
  }
}

export default {
  DEFAULT_SHOP_ITEMS,
  initializeShop,
  getShopItems,
  purchaseItem,
};
