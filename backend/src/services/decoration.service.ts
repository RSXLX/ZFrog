/**
 * DecorationService - 家园装饰系统服务 (V2.0 升级)
 * 
 * 功能:
 * - 获取装饰品库存
 * - 获取/保存房间布局
 * - V2.0: 网格系统支持
 * - V2.0: 冲突检测
 * - V2.0: 编辑锁
 * - V2.0: 舒适度计算
 */

import { PrismaClient, DecorationType } from '@prisma/client';

const prisma = new PrismaClient();

// ============ 类型定义 ============

// V2.0: 网格坐标输入
export interface GridPlacedItemInput {
  userDecorationId: string;
  gridX: number;          // 网格坐标 X (0 ~ gridCols-1)
  gridY: number;          // 网格坐标 Y (0 ~ gridRows-1)
  scale?: number;
  rotation?: number;      // 0, 90, 180, 270
  zIndex?: number;
}

// V1.0 兼容: 百分比坐标输入 (已废弃)
export interface PlacedItemInput {
  userDecorationId: string;
  x: number;              // @deprecated 使用 gridX
  y: number;              // @deprecated 使用 gridY
  gridX?: number;         // V2.0 网格坐标
  gridY?: number;         // V2.0 网格坐标
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export interface LayoutPatchItem {
  id?: string;
  action: 'add' | 'update' | 'remove';
  data?: PlacedItemInput;
}

// V2.0: 网格占用信息
interface GridOccupancy {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  itemId?: string;        // 如果有，表示已存在的物品
}

// V2.0: 冲突检测结果
interface CollisionResult {
  hasCollision: boolean;
  conflictingItems: string[];
  outOfBounds: boolean;
}

// ============ V2.0 格栅系统 ============

/**
 * V2.0: 检查网格冲突
 */
export function checkGridCollision(
  occupiedGrid: boolean[][],
  item: GridOccupancy,
  gridCols: number = 12,
  gridRows: number = 10,
  excludeItemId?: string
): CollisionResult {
  const result: CollisionResult = {
    hasCollision: false,
    conflictingItems: [],
    outOfBounds: false,
  };

  for (let x = item.gridX; x < item.gridX + item.gridWidth; x++) {
    for (let y = item.gridY; y < item.gridY + item.gridHeight; y++) {
      // 边界检查
      if (x < 0 || x >= gridCols || y < 0 || y >= gridRows) {
        result.outOfBounds = true;
        return result;
      }
      // 冲突检查
      if (occupiedGrid[y]?.[x]) {
        result.hasCollision = true;
      }
    }
  }

  return result;
}

/**
 * V2.0: 构建占用网格
 */
export async function buildOccupiedGrid(
  layoutId: string,
  gridCols: number = 12,
  gridRows: number = 10,
  excludeItemId?: string
): Promise<boolean[][]> {
  const items = await prisma.placedItem.findMany({
    where: { 
      layoutId,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    include: {
      userDecoration: {
        include: { decoration: true },
      },
    },
  });

  // 初始化网格
  const grid: boolean[][] = Array(gridRows)
    .fill(null)
    .map(() => Array(gridCols).fill(false));

  // 标记已占用的格子
  for (const item of items) {
    const { gridWidth = 1, gridHeight = 1 } = item.userDecoration.decoration;
    const { gridX, gridY, rotation } = item;
    
    // 考虑旋转后的宽高
    const effectiveWidth = rotation === 90 || rotation === 270 ? gridHeight : gridWidth;
    const effectiveHeight = rotation === 90 || rotation === 270 ? gridWidth : gridHeight;

    for (let x = gridX; x < gridX + effectiveWidth; x++) {
      for (let y = gridY; y < gridY + effectiveHeight; y++) {
        if (x >= 0 && x < gridCols && y >= 0 && y < gridRows) {
          grid[y][x] = true;
        }
      }
    }
  }

  return grid;
}

/**
 * V2.0: 验证布局项的有效性（冲突检测）
 */
export async function validateLayoutItems(
  layoutId: string,
  items: GridPlacedItemInput[],
  gridCols: number = 12,
  gridRows: number = 10
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const grid: boolean[][] = Array(gridRows)
    .fill(null)
    .map(() => Array(gridCols).fill(false));

  for (const item of items) {
    // 获取装饰品信息
    const userDec = await prisma.userDecoration.findUnique({
      where: { id: item.userDecorationId },
      include: { decoration: true },
    });

    if (!userDec) {
      errors.push(`装饰品不存在: ${item.userDecorationId}`);
      continue;
    }

    const { gridWidth = 1, gridHeight = 1 } = userDec.decoration;
    const rotation = item.rotation || 0;
    
    // 考虑旋转
    const effectiveWidth = rotation === 90 || rotation === 270 ? gridHeight : gridWidth;
    const effectiveHeight = rotation === 90 || rotation === 270 ? gridWidth : gridHeight;

    // 边界检查
    if (
      item.gridX < 0 || 
      item.gridX + effectiveWidth > gridCols ||
      item.gridY < 0 || 
      item.gridY + effectiveHeight > gridRows
    ) {
      errors.push(`物品超出边界: ${userDec.decoration.name} at (${item.gridX}, ${item.gridY})`);
      continue;
    }

    // 冲突检查
    for (let x = item.gridX; x < item.gridX + effectiveWidth; x++) {
      for (let y = item.gridY; y < item.gridY + effectiveHeight; y++) {
        if (grid[y][x]) {
          errors.push(`物品位置冲突: ${userDec.decoration.name} at (${x}, ${y})`);
        }
        grid[y][x] = true;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============ V2.0 编辑锁 ============

/**
 * V2.0: 获取编辑锁
 */
export async function acquireEditLock(
  layoutId: string,
  sessionId: string,
  ttlMs: number = 5 * 60 * 1000 // 默认 5 分钟
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  const layout = await prisma.roomLayout.findUnique({
    where: { id: layoutId },
  });

  if (!layout) {
    return { success: false, error: 'Layout not found' };
  }

  // 检查是否已被锁定
  if (layout.editLock) {
    const [lockedSession, expiryStr] = layout.editLock.split(':');
    const expiry = parseInt(expiryStr);
    
    if (Date.now() < expiry) {
      // 锁还有效
      if (lockedSession === sessionId) {
        // 同一会话，刷新锁
        const newExpiry = Date.now() + ttlMs;
        await prisma.roomLayout.update({
          where: { id: layoutId },
          data: { editLock: `${sessionId}:${newExpiry}` },
        });
        return { success: true, expiresAt: new Date(newExpiry) };
      }
      return { success: false, error: 'Lock held by another session' };
    }
    // 锁已过期，可以获取
  }

  // 获取新锁
  const expiresAt = Date.now() + ttlMs;
  await prisma.roomLayout.update({
    where: { id: layoutId },
    data: { editLock: `${sessionId}:${expiresAt}` },
  });

  return { success: true, expiresAt: new Date(expiresAt) };
}

/**
 * V2.0: 释放编辑锁
 */
export async function releaseEditLock(
  layoutId: string,
  sessionId: string
): Promise<boolean> {
  const layout = await prisma.roomLayout.findUnique({
    where: { id: layoutId },
  });

  if (!layout || !layout.editLock) {
    return true; // 没有锁，视为成功
  }

  const [lockedSession] = layout.editLock.split(':');
  if (lockedSession !== sessionId) {
    return false; // 不是自己的锁
  }

  await prisma.roomLayout.update({
    where: { id: layoutId },
    data: { editLock: null },
  });

  return true;
}

/**
 * V2.0: 验证编辑锁
 */
export async function validateEditLock(
  layoutId: string,
  sessionId: string
): Promise<boolean> {
  const layout = await prisma.roomLayout.findUnique({
    where: { id: layoutId },
  });

  if (!layout || !layout.editLock) {
    return false;
  }

  const [lockedSession, expiryStr] = layout.editLock.split(':');
  const expiry = parseInt(expiryStr);

  return lockedSession === sessionId && Date.now() < expiry;
}

// ============ V2.0 舒适度计算 ============

/**
 * V2.0: 计算舒适度分数
 */
export async function calculateComfortScore(layoutId: string): Promise<number> {
  const items = await prisma.placedItem.findMany({
    where: { layoutId },
    include: {
      userDecoration: {
        include: { decoration: true },
      },
    },
  });

  let score = 0;

  for (const item of items) {
    const dec = item.userDecoration.decoration;
    
    // 基础分 = 稀有度 × 10
    score += (dec.rarity || 1) * 10;
    
    // Buff 加成
    if (dec.buffType === 'comfort' && dec.buffValue) {
      score += dec.buffValue;
    }
  }

  // 物品数量奖励 (每个物品 +2，最多 20 个)
  score += Math.min(items.length, 20) * 2;

  // 上限 100
  return Math.min(score, 100);
}

/**
 * V2.0: 获取激活的 Buff 列表
 */
export async function getActiveBuffs(layoutId: string): Promise<Array<{
  code: string;
  name: string;
  value: number;
  fromDecoration: string;
}>> {
  const items = await prisma.placedItem.findMany({
    where: { layoutId },
    include: {
      userDecoration: {
        include: { decoration: true },
      },
    },
  });

  const buffs: Array<{
    code: string;
    name: string;
    value: number;
    fromDecoration: string;
  }> = [];

  const buffNames: Record<string, string> = {
    rest_reduce: '缩短休息',
    luck_boost: '幸运提升',
    visitor_bonus: '访客奖励',
    treasure_boost: '寻宝提升',
    comfort: '舒适度提升',
  };

  for (const item of items) {
    const dec = item.userDecoration.decoration;
    if (dec.buffType && dec.buffValue) {
      buffs.push({
        code: dec.buffType,
        name: buffNames[dec.buffType] || dec.buffType,
        value: dec.buffValue,
        fromDecoration: dec.name,
      });
    }
  }

  return buffs;
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
  const allDecorations = await prisma.userDecoration.findMany({
    where: { frogId },
    include: {
      decoration: true,
      placements: {
        include: { layout: true },
      },
    },
  });

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
 * 获取房间布局 (V2.0: 包含网格信息)
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
 * 保存完整布局 V2.0 (网格版)
 */
export async function saveLayout(
  frogId: number,
  sceneType: string,
  items: PlacedItemInput[],
  options: {
    createSnapshot?: boolean;
    sessionId?: string;
    validateGrid?: boolean;
  } = {}
) {
  const { createSnapshot = true, sessionId, validateGrid = true } = options;

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

  // V2.0: 验证编辑锁
  if (sessionId) {
    const lockValid = await validateEditLock(layout.id, sessionId);
    if (!lockValid) {
      throw new Error('EDIT_LOCK_INVALID: Session does not hold the edit lock');
    }
  }

  // V2.0: 转换为网格坐标输入
  const gridItems: GridPlacedItemInput[] = items.map(item => ({
    userDecorationId: item.userDecorationId,
    gridX: item.gridX ?? Math.round((item.x || 0) * (layout!.gridCols - 1) / 100),
    gridY: item.gridY ?? Math.round((item.y || 0) * (layout!.gridRows - 1) / 100),
    scale: item.scale,
    rotation: item.rotation,
    zIndex: item.zIndex,
  }));

  // V2.0: 验证网格冲突
  if (validateGrid) {
    const validation = await validateLayoutItems(
      layout.id,
      gridItems,
      layout.gridCols,
      layout.gridRows
    );
    if (!validation.valid) {
      throw new Error(`GRID_VALIDATION_FAILED: ${validation.errors.join('; ')}`);
    }
  }

  // 创建快照
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

  // 创建新的摆放项 (V2.0: 使用网格坐标)
  await prisma.placedItem.createMany({
    data: gridItems.map(item => ({
      layoutId: layout!.id,
      userDecorationId: item.userDecorationId,
      gridX: item.gridX,
      gridY: item.gridY,
      scale: item.scale ?? 1.0,
      rotation: item.rotation ?? 0,
      zIndex: item.zIndex ?? 1,
      state: 'normal',
    })),
  });

  // V2.0: 计算并更新舒适度
  const comfortScore = await calculateComfortScore(layout.id);

  // 更新版本号和舒适度
  await prisma.roomLayout.update({
    where: { id: layout.id },
    data: { 
      version: { increment: 1 },
      comfortScore,
    },
  });

  return getLayout(frogId, sceneType);
}

/**
 * 增量更新布局 (PATCH) - V2.0 网格版
 */
export async function patchLayout(
  frogId: number,
  sceneType: string,
  patches: LayoutPatchItem[],
  expectedVersion?: number
) {
  let layout = await prisma.roomLayout.findUnique({
    where: { frogId_sceneType: { frogId, sceneType } },
  });

  if (!layout) {
    layout = await prisma.roomLayout.create({
      data: { frogId, sceneType },
    });
  }

  // 版本校验
  if (expectedVersion !== undefined && layout.version !== expectedVersion) {
    throw new Error(`VERSION_CONFLICT: expected ${expectedVersion}, got ${layout.version}`);
  }

  for (const patch of patches) {
    switch (patch.action) {
      case 'add':
        if (!patch.data) throw new Error('Missing data for add action');
        await prisma.placedItem.create({
          data: {
            layoutId: layout.id,
            userDecorationId: patch.data.userDecorationId,
            gridX: patch.data.gridX ?? Math.round((patch.data.x || 0) * (layout.gridCols - 1) / 100),
            gridY: patch.data.gridY ?? Math.round((patch.data.y || 0) * (layout.gridRows - 1) / 100),
            scale: patch.data.scale ?? 1.0,
            rotation: patch.data.rotation ?? 0,
            zIndex: patch.data.zIndex ?? 1,
            state: 'normal',
          },
        });
        break;

      case 'update':
        if (!patch.id || !patch.data) throw new Error('Missing id or data for update action');
        await prisma.placedItem.update({
          where: { id: patch.id },
          data: {
            gridX: patch.data.gridX ?? (patch.data.x !== undefined 
              ? Math.round(patch.data.x * (layout.gridCols - 1) / 100) 
              : undefined),
            gridY: patch.data.gridY ?? (patch.data.y !== undefined 
              ? Math.round(patch.data.y * (layout.gridRows - 1) / 100) 
              : undefined),
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

  // V2.0: 重新计算舒适度
  const comfortScore = await calculateComfortScore(layout.id);

  await prisma.roomLayout.update({
    where: { id: layout.id },
    data: { 
      version: { increment: 1 },
      comfortScore,
    },
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

  const storedItems = snapshot.items as unknown as Array<{
    userDecorationId: string;
    x?: number;
    y?: number;
    gridX?: number;
    gridY?: number;
    scale?: number;
    rotation?: number;
    zIndex?: number;
  }>;
  
  const items: PlacedItemInput[] = storedItems.map(item => ({
    userDecorationId: item.userDecorationId,
    x: item.x ?? 0,
    y: item.y ?? 0,
    gridX: item.gridX,
    gridY: item.gridY,
    scale: item.scale,
    rotation: item.rotation,
    zIndex: item.zIndex,
  }));
  
  return saveLayout(frogId, sceneType, items, { createSnapshot: true, validateGrid: false });
}

// ============ 导出 ============

export const decorationService = {
  // 装饰品管理
  getAllDecorations,
  getUserDecorations,
  getUnplacedDecorations,
  addDecorationToInventory,
  
  // 布局管理
  getLayout,
  saveLayout,
  patchLayout,
  getLayoutSnapshots,
  restoreSnapshot,
  
  // V2.0: 格栅系统
  checkGridCollision,
  buildOccupiedGrid,
  validateLayoutItems,
  
  // V2.0: 编辑锁
  acquireEditLock,
  releaseEditLock,
  validateEditLock,
  
  // V2.0: 舒适度
  calculateComfortScore,
  getActiveBuffs,
};

export default decorationService;
