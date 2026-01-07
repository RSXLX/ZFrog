/**
 * DecorationService - 家园装饰系统服务
 * 
 * 功能:
 * - 获取装饰品库存
 * - 获取/保存房间布局
 * - 增量更新布局
 * - 版本控制与快照
 */

import { PrismaClient, DecorationType } from '@prisma/client';

const prisma = new PrismaClient();

// ============ 类型定义 ============

export interface PlacedItemInput {
  userDecorationId: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export interface LayoutPatchItem {
  id?: string;        // 已存在的 PlacedItem ID (更新/删除时需要)
  action: 'add' | 'update' | 'remove';
  data?: PlacedItemInput;
}

// ============ 装饰品管理 ============

/**
 * 获取所有可用的装饰品定义
 */
export async function getAllDecorations() {
  return prisma.decoration.findMany({
    orderBy: { type: 'asc' },
  });
}

/**
 * 获取用户拥有的装饰品库存
 */
export async function getUserDecorations(frogId: number) {
  return prisma.userDecoration.findMany({
    where: { frogId },
    include: {
      decoration: true,
      placements: {
        include: {
          layout: true,
        },
      },
    },
  });
}

/**
 * 获取未摆放的装饰品 (用于编辑模式库存栏)
 */
export async function getUnplacedDecorations(frogId: number, sceneType: string) {
  // 获取该用户所有装饰品
  const allDecorations = await prisma.userDecoration.findMany({
    where: { frogId },
    include: {
      decoration: true,
      placements: {
        include: { layout: true },
      },
    },
  });

  // 过滤出未在当前场景摆放的
  return allDecorations.filter(ud => {
    const placedInScene = ud.placements.some(p => p.layout.sceneType === sceneType);
    return !placedInScene || ud.amount > ud.placements.filter(p => p.layout.sceneType === sceneType).length;
  });
}

/**
 * 添加装饰品到用户库存
 */
export async function addDecorationToInventory(
  frogId: number,
  decorationId: string,
  amount: number = 1,
  souvenirId?: number
) {
  // 检查是否已存在 (非纪念品)
  if (!souvenirId) {
    const existing = await prisma.userDecoration.findFirst({
      where: { frogId, decorationId, souvenirId: null },
    });
    
    if (existing) {
      return prisma.userDecoration.update({
        where: { id: existing.id },
        data: { amount: existing.amount + amount },
      });
    }
  }

  return prisma.userDecoration.create({
    data: {
      frogId,
      decorationId,
      amount,
      souvenirId,
    },
  });
}

// ============ 布局管理 ============

/**
 * 获取房间布局
 */
export async function getLayout(frogId: number, sceneType: string) {
  const layout = await prisma.roomLayout.findUnique({
    where: {
      frogId_sceneType: { frogId, sceneType },
    },
    include: {
      items: {
        include: {
          userDecoration: {
            include: { decoration: true },
          },
        },
        orderBy: { zIndex: 'asc' },
      },
    },
  });

  return layout;
}

/**
 * 保存完整布局 (全量替换)
 */
export async function saveLayout(
  frogId: number,
  sceneType: string,
  items: PlacedItemInput[],
  createSnapshot: boolean = true
) {
  // 获取或创建布局
  let layout = await prisma.roomLayout.findUnique({
    where: { frogId_sceneType: { frogId, sceneType } },
    include: { items: true },
  });

  if (!layout) {
    layout = await prisma.roomLayout.create({
      data: { frogId, sceneType },
      include: { items: true },
    });
  }

  // 创建快照 (保存当前状态)
  if (createSnapshot && layout.items.length > 0) {
    await prisma.roomLayoutSnapshot.create({
      data: {
        layoutId: layout.id,
        items: layout.items,
      },
    });
  }

  // 删除旧的摆放项
  await prisma.placedItem.deleteMany({
    where: { layoutId: layout.id },
  });

  // 创建新的摆放项
  const newItems = await prisma.placedItem.createMany({
    data: items.map(item => ({
      layoutId: layout!.id,
      userDecorationId: item.userDecorationId,
      x: item.x,
      y: item.y,
      scale: item.scale ?? 1.0,
      rotation: item.rotation ?? 0,
      zIndex: item.zIndex ?? 1,
    })),
  });

  // 更新版本号
  await prisma.roomLayout.update({
    where: { id: layout.id },
    data: { version: { increment: 1 } },
  });

  return getLayout(frogId, sceneType);
}

/**
 * 增量更新布局 (PATCH)
 */
export async function patchLayout(
  frogId: number,
  sceneType: string,
  patches: LayoutPatchItem[],
  expectedVersion?: number
) {
  // 获取当前布局
  let layout = await prisma.roomLayout.findUnique({
    where: { frogId_sceneType: { frogId, sceneType } },
  });

  if (!layout) {
    layout = await prisma.roomLayout.create({
      data: { frogId, sceneType },
    });
  }

  // 版本校验 (乐观锁)
  if (expectedVersion !== undefined && layout.version !== expectedVersion) {
    throw new Error(`VERSION_CONFLICT: expected ${expectedVersion}, got ${layout.version}`);
  }

  // 处理每个 patch
  for (const patch of patches) {
    switch (patch.action) {
      case 'add':
        if (!patch.data) throw new Error('Missing data for add action');
        await prisma.placedItem.create({
          data: {
            layoutId: layout.id,
            userDecorationId: patch.data.userDecorationId,
            x: patch.data.x,
            y: patch.data.y,
            scale: patch.data.scale ?? 1.0,
            rotation: patch.data.rotation ?? 0,
            zIndex: patch.data.zIndex ?? 1,
          },
        });
        break;

      case 'update':
        if (!patch.id || !patch.data) throw new Error('Missing id or data for update action');
        await prisma.placedItem.update({
          where: { id: patch.id },
          data: {
            x: patch.data.x,
            y: patch.data.y,
            scale: patch.data.scale,
            rotation: patch.data.rotation,
            zIndex: patch.data.zIndex,
          },
        });
        break;

      case 'remove':
        if (!patch.id) throw new Error('Missing id for remove action');
        await prisma.placedItem.delete({
          where: { id: patch.id },
        });
        break;
    }
  }

  // 更新版本号
  await prisma.roomLayout.update({
    where: { id: layout.id },
    data: { version: { increment: 1 } },
  });

  return getLayout(frogId, sceneType);
}

/**
 * 获取布局历史快照
 */
export async function getLayoutSnapshots(frogId: number, sceneType: string, limit: number = 5) {
  const layout = await prisma.roomLayout.findUnique({
    where: { frogId_sceneType: { frogId, sceneType } },
  });

  if (!layout) return [];

  return prisma.roomLayoutSnapshot.findMany({
    where: { layoutId: layout.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * 恢复到快照版本
 */
export async function restoreSnapshot(frogId: number, sceneType: string, snapshotId: string) {
  const snapshot = await prisma.roomLayoutSnapshot.findUnique({
    where: { id: snapshotId },
    include: { layout: true },
  });

  if (!snapshot || snapshot.layout.frogId !== frogId || snapshot.layout.sceneType !== sceneType) {
    throw new Error('Snapshot not found or access denied');
  }

  // 将快照内容转换为 PlacedItemInput 格式
  const storedItems = snapshot.items as unknown as Array<{
    userDecorationId: string;
    x: number;
    y: number;
    scale?: number;
    rotation?: number;
    zIndex?: number;
  }>;
  
  const items: PlacedItemInput[] = storedItems.map(item => ({
    userDecorationId: item.userDecorationId,
    x: item.x,
    y: item.y,
    scale: item.scale,
    rotation: item.rotation,
    zIndex: item.zIndex,
  }));
  
  return saveLayout(frogId, sceneType, items, true);
}

// ============ 导出 ============

export const decorationService = {
  getAllDecorations,
  getUserDecorations,
  getUnplacedDecorations,
  addDecorationToInventory,
  getLayout,
  saveLayout,
  patchLayout,
  getLayoutSnapshots,
  restoreSnapshot,
};

export default decorationService;
