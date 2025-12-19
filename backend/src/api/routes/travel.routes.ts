import { Router } from 'express';
import { prisma } from '../../database';
import { TravelStatus } from '@prisma/client';

const router = Router();

/**
 * GET /api/travels/:frogId
 * 获取青蛙的旅行历史
 */
router.get('/:frogId', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);
        
        const travels = await prisma.travel.findMany({
            where: { 
                frog: {
                    tokenId: frogId
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                souvenir: true,
            },
        });
        
        const travelsParsed = travels.map(travel => {
            let journal = null;
            try {
                if (travel.journalContent) {
                    journal = JSON.parse(travel.journalContent);
                }
            } catch (e) {
                // 如果解析失败，说明可能是旧格式的纯文本
                journal = { 
                    title: '旅行回顾',
                    content: travel.journalContent,
                    mood: 'happy',
                    highlights: []
                };
            }
            return {
                ...travel,
                journal
            };
        });
        
        res.json(travelsParsed);
        
    } catch (error) {
        console.error('Error fetching travels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/:frogId/active
 * 获取青蛙当前进行中的旅行
 */
router.get('/:frogId/active', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);
        const now = new Date();
        
        const activeTravel = await prisma.travel.findFirst({
            where: {
                frog: {
                    tokenId: frogId
                },
                status: {
                    in: [TravelStatus.Active, TravelStatus.Processing],
                },
                endTime: {
                    gt: now  // 只返回还未结束的旅行
                }
            },
        });
        
        if (!activeTravel) {
            return res.status(404).json({ error: 'No active travel' });
        }
        
        // 计算剩余时间
        const remainingMs = activeTravel.endTime.getTime() - Date.now();
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        
        res.json({
            ...activeTravel,
            remainingSeconds,
            progress: Math.min(100, Math.floor(
                (Date.now() - activeTravel.startTime.getTime()) /
                (activeTravel.endTime.getTime() - activeTravel.startTime.getTime()) * 100
            )),
        });
        
    } catch (error) {
        console.error('Error fetching active travel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/journal/:travelId
 * 获取旅行日记详情
 */
router.get('/journal/:travelId', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: {
                frog: true,
                souvenir: true,
            },
        });
        
        if (!travel || !travel.journalContent) {
            return res.status(404).json({ error: 'Journal not found' });
        }
        
        let journal = null;
        try {
            if (travel.journalContent) {
                journal = JSON.parse(travel.journalContent);
            }
        } catch (e) {
            journal = { 
                title: '旅行回顾',
                content: travel.journalContent,
                mood: 'happy',
                highlights: []
            };
        }

        res.json({
            frogName: travel.frog.name,
            journalHash: travel.journalHash,
            journal,
            souvenir: travel.souvenir,
            completedAt: travel.completedAt,
        });
        
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
