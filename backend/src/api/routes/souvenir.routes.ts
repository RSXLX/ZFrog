// backend/src/api/routes/souvenir.routes.ts

import { Router } from 'express';
import { prisma } from '../../database';

const router = Router();

/**
 * GET /api/souvenirs
 * 获取纪念品列表（支持按青蛙ID或地址筛选）
 * 查询参数：
 * - frogId: 青蛙ID（可选）
 * - ownerAddress: 所有者地址（可选，用于获取该地址所有青蛙的纪念品）
 */
router.get('/', async (req, res) => {
  try {
    const { frogId, ownerAddress } = req.query;
    
    if (frogId) {
      // 获取特定青蛙的纪念品
      const souvenirs = await prisma.souvenir.findMany({
        where: { frogId: parseInt(frogId as string) },
        orderBy: { createdAt: 'desc' }
      });
      
      // 获取每个纪念品的图片
      const souvenirsWithImages = await Promise.all(
        souvenirs.map(async (souvenir) => {
          const images = await prisma.souvenirImage.findMany({
            where: { souvenirId: souvenir.tokenId.toString() }
          });
          return { ...souvenir, images };
        })
      );
      
      res.json({ success: true, data: souvenirsWithImages });
    } else if (ownerAddress) {
      // 获取地址下所有青蛙的纪念品
      const frogs = await prisma.frog.findMany({
        where: { ownerAddress: (ownerAddress as string).toLowerCase() },
        select: { id: true, name: true, tokenId: true }
      });
      
      const allSouvenirs = [];
      for (const frog of frogs) {
        const souvenirs = await prisma.souvenir.findMany({
          where: { frogId: frog.id },
          orderBy: { createdAt: 'desc' }
        });
        
        if (souvenirs.length > 0) {
          // 获取每个纪念品的图片
          const souvenirsWithImages = await Promise.all(
            souvenirs.map(async (souvenir) => {
              const images = await prisma.souvenirImage.findMany({
                where: { souvenirId: souvenir.tokenId.toString() }
              });
              return { ...souvenir, images };
            })
          );
          
          allSouvenirs.push({
            frogId: frog.id,
            frogTokenId: frog.tokenId,
            frogName: frog.name,
            souvenirs: souvenirsWithImages
          });
        }
      }
      res.json({ success: true, data: allSouvenirs });
    } else {
      res.status(400).json({ success: false, error: 'Missing frogId or ownerAddress parameter' });
    }
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/souvenirs/:frogId
 * 获取特定青蛙的所有纪念品
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const souvenirs = await prisma.souvenir.findMany({
      where: { frogId },
      orderBy: { createdAt: 'desc' }
    });
    
    // 获取每个纪念品的图片
    const souvenirsWithImages = await Promise.all(
      souvenirs.map(async (souvenir) => {
        const images = await prisma.souvenirImage.findMany({
          where: { souvenirId: souvenir.tokenId.toString() }
        });
        return { ...souvenir, images };
      })
    );
    
    res.json({ success: true, data: souvenirsWithImages });
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;