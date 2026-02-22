/**
 * 🐸 宠物蛋系统 - 商店 API 路由
 */

import { Router, Request, Response } from 'express';
import {
  getShopItems,
  purchaseItem,
  initializeShop,
} from '../../services/shop.service';

// 本地定义商店分类类型
type ShopCategory = 'FOOD' | 'MEDICINE' | 'BOOST' | 'DECORATION' | 'SPECIAL';

const router = Router();

/**
 * GET /api/shop/items
 * 获取商店商品列表
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { ownerAddress, category } = req.query;

    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Owner address is required',
      });
    }

    const categoryFilter = category as ShopCategory | undefined;
    const items = await getShopItems(ownerAddress, categoryFilter);

    return res.json({
      success: true,
      data: {
        items,
        categories: ['FOOD', 'MEDICINE', 'BOOST', 'DECORATION', 'SPECIAL'],
      },
    });
  } catch (error) {
    console.error('[Shop] Get items error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shop items',
    });
  }
});

/**
 * POST /api/shop/purchase
 * 购买商品
 */
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { ownerAddress, itemId } = req.body;

    if (!ownerAddress || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'Owner address and itemId are required',
      });
    }

    const result = await purchaseItem(ownerAddress, itemId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      item: result.item,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('[Shop] Purchase error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purchase item',
    });
  }
});

/**
 * POST /api/shop/init
 * 初始化商店（管理员）
 */
router.post('/init', async (_req: Request, res: Response) => {
  try {
    await initializeShop();
    return res.json({
      success: true,
      message: 'Shop initialized',
    });
  } catch (error) {
    console.error('[Shop] Init error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize shop',
    });
  }
});

export default router;
