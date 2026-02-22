import { Router } from 'express';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';

const router = Router();

// 食物配置 (与前端保持一致)
const FOOD_CONFIG: Record<string, { name: string; energy: number; happiness: number; rarity: string }> = {
  fly: { name: '苍蝇', energy: 10, happiness: 5, rarity: 'common' },
  worm: { name: '虫子', energy: 15, happiness: 8, rarity: 'common' },
  cricket: { name: '蟋蟀', energy: 25, happiness: 15, rarity: 'uncommon' },
  butterfly: { name: '蝴蝶', energy: 20, happiness: 20, rarity: 'uncommon' },
  dragonfly: { name: '蜻蜓', energy: 35, happiness: 25, rarity: 'rare' },
  golden_fly: { name: '金苍蝇', energy: 50, happiness: 40, rarity: 'legendary' },
};

// 互动类型配置
const INTERACTION_CONFIG: Record<string, { happinessBonus: number }> = {
  pet: { happinessBonus: 5 },      // 抚摸
  play: { happinessBonus: 10 },    // 玩耍
  talk: { happinessBonus: 3 },     // 说话
};

/**
 * GET /api/frogs/:tokenId/status
 * 获取青蛙当前状态 (饥饿值/快乐值)
 */
router.get('/:tokenId/status', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      select: {
        id: true,
        tokenId: true,
        name: true,
        hunger: true,
        happiness: true,
        lastFedAt: true,
        lastInteractedAt: true,
      },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    res.json({
      success: true,
      data: {
        tokenId: frog.tokenId,
        name: frog.name,
        hunger: frog.hunger,
        happiness: frog.happiness,
        lastFedAt: frog.lastFedAt?.toISOString() || null,
        lastInteractedAt: frog.lastInteractedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error('Error fetching frog status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frogs/:tokenId/feed
 * 喂食青蛙
 * Body: { foodType: string, ownerAddress: string }
 */
router.post('/:tokenId/feed', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { foodType, ownerAddress } = req.body;

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    if (!foodType || !FOOD_CONFIG[foodType]) {
      return res.status(400).json({ error: 'Invalid food type' });
    }

    if (!ownerAddress) {
      return res.status(400).json({ error: 'Owner address required' });
    }

    // 验证青蛙所有权
    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      include: {
        foodInventory: true,
      },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    if (frog.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not the owner of this frog' });
    }

    // 检查食物库存
    const inventoryItem = frog.foodInventory.find(item => item.foodType === foodType);
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      return res.status(400).json({ error: 'Not enough food in inventory' });
    }

    const foodConfig = FOOD_CONFIG[foodType];

    // 更新青蛙状态和库存 (事务)
    const result = await prisma.$transaction(async (tx) => {
      // 扣减库存
      await tx.foodInventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: { decrement: 1 } },
      });

      // 更新青蛙状态
      const updatedFrog = await tx.frog.update({
        where: { tokenId },
        data: {
          hunger: { increment: Math.min(foodConfig.energy, 100 - frog.hunger) },
          happiness: { increment: Math.min(foodConfig.happiness, 100 - frog.happiness) },
          lastFedAt: new Date(),
        },
        select: {
          hunger: true,
          happiness: true,
          lastFedAt: true,
        },
      });

      return updatedFrog;
    });

    logger.info(`Frog ${tokenId} fed with ${foodType}, hunger: ${result.hunger}, happiness: ${result.happiness}`);

    res.json({
      success: true,
      data: {
        hunger: result.hunger,
        happiness: result.happiness,
        lastFedAt: result.lastFedAt?.toISOString(),
        foodUsed: {
          type: foodType,
          name: foodConfig.name,
          energyGiven: foodConfig.energy,
          happinessGiven: foodConfig.happiness,
        },
      },
    });
  } catch (error) {
    logger.error('Error feeding frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frogs/:tokenId/interact
 * 与青蛙互动 (抚摸/玩耍等)
 * Body: { interactionType: string, ownerAddress: string }
 */
router.post('/:tokenId/interact', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { interactionType, ownerAddress } = req.body;

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    if (!interactionType || !INTERACTION_CONFIG[interactionType]) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }

    if (!ownerAddress) {
      return res.status(400).json({ error: 'Owner address required' });
    }

    // 验证青蛙所有权
    const frog = await prisma.frog.findUnique({
      where: { tokenId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    if (frog.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not the owner of this frog' });
    }

    const config = INTERACTION_CONFIG[interactionType];

    // 更新青蛙状态
    const updatedFrog = await prisma.frog.update({
      where: { tokenId },
      data: {
        happiness: { increment: Math.min(config.happinessBonus, 100 - frog.happiness) },
        lastInteractedAt: new Date(),
      },
      select: {
        happiness: true,
        lastInteractedAt: true,
      },
    });

    logger.info(`Frog ${tokenId} interacted with (${interactionType}), happiness: ${updatedFrog.happiness}`);

    res.json({
      success: true,
      data: {
        happiness: updatedFrog.happiness,
        lastInteractedAt: updatedFrog.lastInteractedAt?.toISOString(),
        interactionType,
        happinessGiven: config.happinessBonus,
      },
    });
  } catch (error) {
    logger.error('Error interacting with frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frogs/:tokenId/inventory
 * 获取食物库存
 */
router.get('/:tokenId/inventory', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      include: {
        foodInventory: true,
      },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 将库存转换为便于前端使用的格式
    const inventory: Record<string, number> = {};
    for (const item of frog.foodInventory) {
      inventory[item.foodType] = item.quantity;
    }

    // 确保所有食物类型都有条目 (方便前端显示)
    for (const foodType of Object.keys(FOOD_CONFIG)) {
      if (!(foodType in inventory)) {
        inventory[foodType] = 0;
      }
    }

    res.json({
      success: true,
      data: {
        tokenId: frog.tokenId,
        inventory,
        foodTypes: FOOD_CONFIG,
      },
    });
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frogs/:tokenId/inventory
 * 添加食物到库存 (内部调用/旅行奖励)
 * Body: { foodType: string, quantity: number, source?: string }
 */
router.post('/:tokenId/inventory', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { foodType, quantity, source = 'unknown' } = req.body;

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    if (!foodType || !FOOD_CONFIG[foodType]) {
      return res.status(400).json({ error: 'Invalid food type' });
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 使用 upsert 添加或更新库存
    const updatedInventory = await prisma.foodInventory.upsert({
      where: {
        frogId_foodType: {
          frogId: frog.id,
          foodType,
        },
      },
      create: {
        frogId: frog.id,
        foodType,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    logger.info(`Added ${quantity}x ${foodType} to frog ${tokenId}'s inventory (source: ${source})`);

    res.json({
      success: true,
      data: {
        foodType,
        newQuantity: updatedInventory.quantity,
        added: quantity,
        source,
      },
    });
  } catch (error) {
    logger.error('Error adding to inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frogs/:tokenId/inventory/batch
 * 批量添加食物到库存 (旅行奖励)
 * Body: { foods: Array<{ foodType: string, quantity: number }>, source?: string }
 */
router.post('/:tokenId/inventory/batch', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { foods, source = 'travel_reward' } = req.body;

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    if (!Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({ error: 'Foods array required' });
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 验证所有食物类型
    for (const food of foods) {
      if (!food.foodType || !FOOD_CONFIG[food.foodType]) {
        return res.status(400).json({ error: `Invalid food type: ${food.foodType}` });
      }
      if (!food.quantity || food.quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be positive' });
      }
    }

    // 批量更新库存
    const results = await prisma.$transaction(
      foods.map(food =>
        prisma.foodInventory.upsert({
          where: {
            frogId_foodType: {
              frogId: frog.id,
              foodType: food.foodType,
            },
          },
          create: {
            frogId: frog.id,
            foodType: food.foodType,
            quantity: food.quantity,
          },
          update: {
            quantity: { increment: food.quantity },
          },
        })
      )
    );

    logger.info(`Batch added foods to frog ${tokenId}'s inventory: ${JSON.stringify(foods)} (source: ${source})`);

    res.json({
      success: true,
      data: {
        added: foods,
        source,
        newInventory: results.map(r => ({
          foodType: r.foodType,
          quantity: r.quantity,
        })),
      },
    });
  } catch (error) {
    logger.error('Error batch adding to inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
