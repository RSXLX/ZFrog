/**
 * AI Service 微服务 (P2 微服务拆分)
 * 职责：AI内容生成、Prompt管理、质量控制
 */

import express from 'express';
import { createClient } from '@redis/client';
import { logger } from './utils/logger';
import { PromptEngine } from './services/PromptEngine';
import { ContentGenerator } from './services/ContentGenerator';
import { QualityController } from './services/QualityController';
import { config } from './config';

const app = express();
const PORT = process.env.PORT || 3003;

// Redis 连接
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('connect', () => logger.info('Redis connected'));

// 服务实例
const promptEngine = new PromptEngine(redis);
const contentGenerator = new ContentGenerator(redis);
const qualityController = new QualityController(redis);

// 中间件
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis.isReady,
    services: {
      promptEngine: true,
      contentGenerator: true,
      qualityController: true
    }
  });
});

// 生成日记
app.post('/generate/journal', async (req, res) => {
  try {
    const {
      frogName,
      frogPersonality,
      observation,
      duration,
      chainConfig,
      footprints,
      options = {}
    } = req.body;

    if (!frogName || !observation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 构建 Prompt
    const prompt = await promptEngine.buildJournalPrompt({
      frogName,
      frogPersonality,
      observation,
      duration,
      chainConfig,
      footprints,
      style: options.style || 'default'
    });

    // 生成内容
    const journal = await contentGenerator.generateJournal(prompt, {
      temperature: options.temperature || 0.8,
      maxTokens: options.maxTokens || 500,
      retries: options.retries || 3
    });

    // 质量检查
    const qualityCheck = await qualityController.checkJournal(journal, {
      expectedLength: { min: 100, max: 300 },
      requiredElements: ['observation', 'mood', 'discovery'],
      personalityMatch: frogPersonality
    });

    if (!qualityCheck.passed && qualityCheck.score < 0.6) {
      // 重新生成
      logger.warn(`[AI Service] Quality check failed (${qualityCheck.score}), regenerating...`);
      const retryJournal = await contentGenerator.generateJournal(prompt, {
        temperature: 0.9,
        maxTokens: 500,
        retries: 1
      });
      
      return res.json({
        success: true,
        data: {
          journal: retryJournal,
          quality: await qualityController.checkJournal(retryJournal),
          regenerated: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        journal,
        quality: qualityCheck,
        prompt: options.includePrompt ? prompt : undefined
      }
    });
  } catch (error) {
    logger.error('[AI Service] Generate journal error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed'
    });
  }
});

// 生成纪念品描述
app.post('/generate/souvenir', async (req, res) => {
  try {
    const {
      rarity,
      chainName,
      travelDuration,
      discoveries,
      options = {}
    } = req.body;

    if (!rarity || !chainName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prompt = await promptEngine.buildSouvenirPrompt({
      rarity,
      chainName,
      travelDuration,
      discoveries,
      style: options.style || 'default'
    });

    const description = await contentGenerator.generateSouvenir(prompt, {
      temperature: options.temperature || 0.7,
      maxTokens: 200
    });

    // 生成名称
    const name = await contentGenerator.generateSouvenirName(prompt, {
      rarity,
      chainName
    });

    res.json({
      success: true,
      data: {
        name,
        description,
        rarity,
        chain: chainName
      }
    });
  } catch (error) {
    logger.error('[AI Service] Generate souvenir error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed'
    });
  }
});

// 青蛙性格分析
app.post('/analyze/personality', async (req, res) => {
  try {
    const {
      frogId,
      birthBlock,
      ownerAddress,
      travelHistory
    } = req.body;

    if (!frogId || !birthBlock || !ownerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const personality = await promptEngine.generatePersonality({
      frogId,
      birthBlock,
      ownerAddress,
      travelHistory
    });

    res.json({
      success: true,
      data: {
        personality,
        traits: personality.traits,
        preferences: personality.preferences,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[AI Service] Personality analysis error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed'
    });
  }
});

// Prompt 模板管理
app.get('/prompts/templates', async (req, res) => {
  try {
    const templates = await promptEngine.getAllTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('[AI Service] Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

app.post('/prompts/templates', async (req, res) => {
  try {
    const { name, template, variables } = req.body;
    
    if (!name || !template) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await promptEngine.saveTemplate(name, template, variables);
    
    res.json({
      success: true,
      message: 'Template saved successfully'
    });
  } catch (error) {
    logger.error('[AI Service] Save template error:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// 启动服务器
async function start() {
  try {
    await redis.connect();
    
    app.listen(PORT, () => {
      logger.info(`[AI Service] Running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
