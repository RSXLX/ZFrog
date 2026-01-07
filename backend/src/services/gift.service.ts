/**
 * GiftService - 礼物盒系统服务
 * 
 * 功能:
 * - 发送/接收礼物
 * - 打开礼物
 * - NFT 礼物追踪
 */

import { PrismaClient, GiftType } from '@prisma/client';

const prisma = new PrismaClient();

// ============ 类型定义 ============

export interface SendGiftInput {
  fromAddress: string;
  toFrogId: number;
  giftType: GiftType;
  itemName: string;
  itemImageUrl?: string;
  quantity?: number;
  nftContract?: string;
  nftTokenId?: string;
  txHash?: string;
  message?: string;
}

// ============ 礼物管理 ============

/**
 * 发送礼物
 */
export async function sendGift(input: SendGiftInput) {
  return prisma.gift.create({
    data: {
      fromAddress: input.fromAddress.toLowerCase(),
      toFrogId: input.toFrogId,
      giftType: input.giftType,
      itemName: input.itemName,
      itemImageUrl: input.itemImageUrl,
      quantity: input.quantity ?? 1,
      nftContract: input.nftContract,
      nftTokenId: input.nftTokenId,
      txHash: input.txHash,
      message: input.message,
    },
    include: {
      toFrog: true,
    },
  });
}

/**
 * 获取青蛙收到的礼物列表
 */
export async function getReceivedGifts(
  frogId: number,
  options?: {
    unopenedOnly?: boolean;
    page?: number;
    pageSize?: number;
  }
) {
  const { unopenedOnly = false, page = 1, pageSize = 20 } = options ?? {};

  const where = {
    toFrogId: frogId,
    ...(unopenedOnly ? { isOpened: false } : {}),
  };

  const [gifts, total] = await Promise.all([
    prisma.gift.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gift.count({ where }),
  ]);

  return {
    gifts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取未开封礼物数量
 */
export async function getUnopenedGiftCount(frogId: number) {
  return prisma.gift.count({
    where: {
      toFrogId: frogId,
      isOpened: false,
    },
  });
}

/**
 * 打开礼物
 */
export async function openGift(giftId: string, frogId: number) {
  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
  });

  if (!gift) {
    throw new Error('Gift not found');
  }

  if (gift.toFrogId !== frogId) {
    throw new Error('Not authorized to open this gift');
  }

  if (gift.isOpened) {
    throw new Error('Gift already opened');
  }

  // 打开礼物
  const openedGift = await prisma.gift.update({
    where: { id: giftId },
    data: {
      isOpened: true,
      openedAt: new Date(),
    },
  });

  // 如果是装饰品类型，自动添加到库存
  if (gift.giftType === 'DECORATION') {
    // TODO: 关联到 UserDecoration
  }

  return openedGift;
}

/**
 * 获取发送的礼物历史
 */
export async function getSentGifts(
  fromAddress: string,
  options?: {
    page?: number;
    pageSize?: number;
  }
) {
  const { page = 1, pageSize = 20 } = options ?? {};

  const where = {
    fromAddress: fromAddress.toLowerCase(),
  };

  const [gifts, total] = await Promise.all([
    prisma.gift.findMany({
      where,
      include: { toFrog: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gift.count({ where }),
  ]);

  return {
    gifts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============ 导出 ============

export const giftService = {
  sendGift,
  getReceivedGifts,
  getUnopenedGiftCount,
  openGift,
  getSentGifts,
};

export default giftService;
