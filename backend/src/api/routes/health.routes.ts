import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * 健康检查
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'zetafrog-backend',
        version: '1.0.0',
    });
});

/**
 * GET /api/health/ready
 * 就绪检查
 */
router.get('/ready', (req, res) => {
    res.json({
        ready: true,
        timestamp: new Date().toISOString(),
    });
});

export default router;
