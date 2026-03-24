/**
 * Admin API Routes
 * 管理员控制台 API 接口
 */
import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../database';
import { airdropService } from '../../services/airdrop/airdrop.service';
import { badgeMaintenanceService } from '../../services/badge/badge-maintenance.service';
import { lifeCommandService } from '../../modules/life/life.command';
import { memoryPalaceService } from '../../modules/memory-palace/memory-palace.service';
import v3IntegrationsRoutes from './admin/v3-integrations.routes';
import v3CouncilRoutes from './admin/v3-council.routes';
import v3RuntimeRoutes from './admin/v3-runtime.routes';
import v3MemoryPalacesRoutes from './admin/v3-memory-palaces.routes';
import v3CreatorsRoutes from './admin/v3-creators.routes';
import v3PartnersRoutes from './admin/v3-partners.routes';
import v3RelationshipGraphRoutes from './admin/v3-relationship-graph.routes';

const router: Router = Router();

router.use('/v3/integrations', v3IntegrationsRoutes);
router.use('/v3/runtime', v3RuntimeRoutes);
router.use('/v3/council', v3CouncilRoutes);
router.use('/v3/memory-palaces', v3MemoryPalacesRoutes);
router.use('/v3/creators', v3CreatorsRoutes);
router.use('/v3/partners', v3PartnersRoutes);
router.use('/v3/relationship-graph', v3RelationshipGraphRoutes);

function ok<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: Record<string, unknown> } = {}
) {
  const { status = 200, message, meta } = options;
  return res.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  });
}

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toOptionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

// ========== 仪表盘 ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 统计数据
    const [totalFrogs, totalTravels, activeTravels, totalBadgesUnlocked, totalFriendships, recentDomainEvents] = await Promise.all([
      prisma.frog.count(),
      prisma.travel.count(),
      prisma.travel.count({ where: { status: 'Active' } }),
      prisma.userBadge.count(),
      prisma.friendship.count({ where: { status: 'Accepted' } }),
      prisma.domainEvent.findMany({
        orderBy: { occurredAt: 'desc' },
        take: 12,
        select: {
          id: true,
          aggregateType: true,
          aggregateId: true,
          eventType: true,
          frogId: true,
          travelId: true,
          source: true,
          requestId: true,
          occurredAt: true,
        },
      }),
    ]);

    // 服务状态
    const services = {
      backend: 'healthy' as const,
      database: 'connected' as const,
    };

    // 链状态检查
    const chains = await checkChainStatus();

    // 合约状态
    const contracts = getContractInfo();

    const events = recentDomainEvents.map((item) => ({
      id: item.id.toString(),
      aggregateType: item.aggregateType,
      aggregateId: item.aggregateId,
      eventType: item.eventType,
      frogId: item.frogId,
      travelId: item.travelId,
      source: item.source,
      requestId: item.requestId,
      occurredAt: item.occurredAt.toISOString(),
    }));

    return ok(res, {
      stats: { totalFrogs, totalTravels, activeTravels, totalBadgesUnlocked, totalFriendships },
      services,
      chains,
      contracts,
      recentDomainEvents: events,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return fail(res, 500, 'Failed to fetch dashboard data');
  }
});

// ========== V1 观测：人类验证 ==========
router.get('/verifications', async (req: Request, res: Response) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = toPositiveInt(req.query.pageSize, 20);
    const skip = (page - 1) * pageSize;
    const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
    const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress.trim() : '';
    const provider = typeof req.query.provider === 'string' ? req.query.provider.trim() : '';
    const verifiedRaw = typeof req.query.verified === 'string' ? req.query.verified.trim().toLowerCase() : '';

    const where: Record<string, unknown> = {};
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (walletAddress) {
      where.walletAddress = { contains: walletAddress.toLowerCase(), mode: 'insensitive' };
    }
    if (provider) {
      where.provider = { contains: provider, mode: 'insensitive' };
    }
    if (verifiedRaw === 'true' || verifiedRaw === '1') {
      where.verified = true;
    } else if (verifiedRaw === 'false' || verifiedRaw === '0') {
      where.verified = false;
    }

    const [verifications, total] = await Promise.all([
      prisma.humanVerification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          action: true,
          provider: true,
          verified: true,
          nullifierHash: true,
          createdAt: true,
        },
      }),
      prisma.humanVerification.count({ where }),
    ]);

    const ownerAddresses = Array.from(
      new Set(verifications.map((item) => item.walletAddress.toLowerCase()))
    );
    const frogs = ownerAddresses.length
      ? await prisma.frog.findMany({
          where: {
            ownerAddress: { in: ownerAddresses },
          },
          select: {
            id: true,
            tokenId: true,
            name: true,
            ownerAddress: true,
          },
        })
      : [];

    const frogByOwner = new Map<string, (typeof frogs)[number]>();
    for (const frog of frogs) {
      frogByOwner.set(frog.ownerAddress.toLowerCase(), frog);
    }

    const data = verifications.map((item) => {
      const frog = frogByOwner.get(item.walletAddress.toLowerCase());
      return {
        id: item.id,
        walletAddress: item.walletAddress,
        action: item.action,
        provider: item.provider,
        verified: item.verified,
        nullifierHash: item.nullifierHash,
        createdAt: item.createdAt.toISOString(),
        frog: frog
          ? {
              id: frog.id,
              tokenId: frog.tokenId,
              name: frog.name,
            }
          : null,
      };
    });

    return ok(res, data, {
      meta: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Verifications fetch error:', error);
    return fail(res, 500, 'Failed to fetch verifications');
  }
});

// ========== V1 观测：仪式 ==========
router.get('/rituals', async (req: Request, res: Response) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = toPositiveInt(req.query.pageSize, 20);
    const skip = (page - 1) * pageSize;
    const ritualType = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const frogId = toOptionalPositiveInt(req.query.frogId);
    const targetFrogId = toOptionalPositiveInt(req.query.targetFrogId);

    const where: Record<string, unknown> = {};
    if (ritualType) {
      where.ritualType = { contains: ritualType.toUpperCase(), mode: 'insensitive' };
    }
    if (status) {
      where.status = status.toUpperCase();
    }
    if (frogId) {
      where.frogId = frogId;
    }
    if (targetFrogId) {
      where.targetFrogId = targetFrogId;
    }

    const [rituals, total] = await Promise.all([
      prisma.ritual.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          frog: {
            select: { id: true, tokenId: true, name: true },
          },
          targetFrog: {
            select: { id: true, tokenId: true, name: true },
          },
        },
      }),
      prisma.ritual.count({ where }),
    ]);

    const data = rituals.map((item) => ({
      id: item.id.toString(),
      frogId: item.frogId,
      targetFrogId: item.targetFrogId,
      ritualType: item.ritualType,
      status: item.status,
      payload: item.payload,
      startedAt: item.startedAt.toISOString(),
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      frog: item.frog,
      targetFrog: item.targetFrog,
    }));

    return ok(res, data, {
      meta: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Rituals fetch error:', error);
    return fail(res, 500, 'Failed to fetch rituals');
  }
});

// ========== V1 观测：记忆宫殿 ==========
router.get('/memory-palaces', async (req: Request, res: Response) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = toPositiveInt(req.query.pageSize, 20);
    const skip = (page - 1) * pageSize;
    const frogId = toOptionalPositiveInt(req.query.frogId);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: Record<string, unknown> = {};
    if (frogId) {
      where.frogId = frogId;
    }
    if (search) {
      where.OR = [
        { recapText: { contains: search, mode: 'insensitive' } },
        { frog: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [palaces, total] = await Promise.all([
      prisma.memoryPalace.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          frog: {
            select: {
              id: true,
              tokenId: true,
              name: true,
              ownerAddress: true,
            },
          },
        },
      }),
      prisma.memoryPalace.count({ where }),
    ]);

    const data = palaces.map((item) => ({
      id: item.id,
      frogId: item.frogId,
      frog: item.frog,
      recapText: item.recapText,
      recapPreview: item.recapText ? item.recapText.slice(0, 200) : null,
      timeline: item.timeline,
      timelineCount: Array.isArray(item.timeline) ? item.timeline.length : 0,
      highlights: item.highlights,
      highlightCount: Array.isArray(item.highlights) ? item.highlights.length : 0,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return ok(res, data, {
      meta: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Memory palace fetch error:', error);
    return fail(res, 500, 'Failed to fetch memory palaces');
  }
});

// ========== V2 观测：Relationship Attestations ==========
router.get('/attestations', async (req: Request, res: Response) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = toPositiveInt(req.query.pageSize, 20);
    const skip = (page - 1) * pageSize;
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const attestationType = typeof req.query.attestationType === 'string' ? req.query.attestationType.trim() : '';
    const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';
    const txHash = typeof req.query.txHash === 'string' ? req.query.txHash.trim().toLowerCase() : '';
    const subjectFrogId = toOptionalPositiveInt(req.query.subjectFrogId);
    const objectFrogId = toOptionalPositiveInt(req.query.objectFrogId);

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (attestationType) {
      where.attestationType = { contains: attestationType, mode: 'insensitive' };
    }
    if (source) {
      where.source = { contains: source, mode: 'insensitive' };
    }
    if (subjectFrogId) {
      where.subjectFrogId = subjectFrogId;
    }
    if (objectFrogId) {
      where.objectFrogId = objectFrogId;
    }
    if (txHash) {
      where.onchainMilestones = {
        some: {
          milestoneType: 'RELATIONSHIP_ATTESTED',
          txHash: { contains: txHash, mode: 'insensitive' },
        },
      };
    }

    const [attestations, total] = await Promise.all([
      prisma.relationshipAttestation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          onchainMilestones: {
            where: { milestoneType: 'RELATIONSHIP_ATTESTED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              txHash: true,
              chainId: true,
              blockNumber: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.relationshipAttestation.count({ where }),
    ]);

    const frogIds = Array.from(
      new Set(
        attestations.flatMap((item) => [item.subjectFrogId, item.objectFrogId]).filter((id) => Number.isInteger(id))
      )
    );
    const frogs = frogIds.length
      ? await prisma.frog.findMany({
          where: { id: { in: frogIds } },
          select: {
            id: true,
            tokenId: true,
            name: true,
          },
        })
      : [];

    const frogById = new Map<number, (typeof frogs)[number]>();
    for (const frog of frogs) {
      frogById.set(frog.id, frog);
    }

    const data = attestations.map((item) => {
      const subject = frogById.get(item.subjectFrogId) || null;
      const object = frogById.get(item.objectFrogId) || null;
      const latestOnchain = item.onchainMilestones[0] || null;

      return {
        id: item.id,
        subjectFrogId: item.subjectFrogId,
        objectFrogId: item.objectFrogId,
        subjectFrog: subject,
        objectFrog: object,
        attestationType: item.attestationType,
        source: item.source,
        status: item.status,
        idempotencyKey: item.idempotencyKey,
        createdByAddress: item.createdByAddress.toLowerCase(),
        onchainTrace: latestOnchain
          ? {
              milestoneId: latestOnchain.id.toString(),
              txHash: latestOnchain.txHash,
              chainId: latestOnchain.chainId,
              blockNumber: latestOnchain.blockNumber?.toString() || null,
              recordedAt: latestOnchain.createdAt.toISOString(),
            }
          : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });

    return ok(res, data, {
      meta: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Attestations fetch error:', error);
    return fail(res, 500, 'Failed to fetch attestations');
  }
});

// ========== V1 观测：关键事件 ==========
router.get('/domain-events', async (req: Request, res: Response) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = toPositiveInt(req.query.pageSize, 20);
    const skip = (page - 1) * pageSize;
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType.trim() : '';
    const aggregateType = typeof req.query.aggregateType === 'string' ? req.query.aggregateType.trim() : '';
    const frogId = toOptionalPositiveInt(req.query.frogId);
    const travelId = toOptionalPositiveInt(req.query.travelId);
    const familyId = toOptionalPositiveInt(req.query.familyId);

    const filters: Record<string, unknown>[] = [];
    if (eventType) {
      filters.push({ eventType: { contains: eventType, mode: 'insensitive' } });
    }
    if (aggregateType) {
      filters.push({ aggregateType: { contains: aggregateType, mode: 'insensitive' } });
    }
    if (frogId) {
      filters.push({ frogId });
    }
    if (travelId) {
      filters.push({ travelId });
    }
    if (familyId) {
      filters.push({ aggregateType: { contains: 'family', mode: 'insensitive' } });
      filters.push({ aggregateId: String(familyId) });
    }

    const where: Record<string, unknown> = filters.length > 0 ? { AND: filters } : {};

    const [events, total] = await Promise.all([
      prisma.domainEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
        select: {
          id: true,
          aggregateType: true,
          aggregateId: true,
          eventType: true,
          frogId: true,
          travelId: true,
          payload: true,
          requestId: true,
          traceId: true,
          source: true,
          occurredAt: true,
          createdAt: true,
        },
      }),
      prisma.domainEvent.count({ where }),
    ]);

    const data = events.map((item) => ({
      id: item.id.toString(),
      aggregateType: item.aggregateType,
      aggregateId: item.aggregateId,
      eventType: item.eventType,
      frogId: item.frogId,
      travelId: item.travelId,
      payload: item.payload,
      requestId: item.requestId,
      traceId: item.traceId,
      source: item.source,
      occurredAt: item.occurredAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));

    return ok(res, data, {
      meta: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Domain events fetch error:', error);
    return fail(res, 500, 'Failed to fetch domain events');
  }
});

// ========== 合约管理 ==========
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const contracts = getContractInfo();
    return ok(res, contracts);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch contracts');
  }
});

router.get('/contracts/verify', async (req: Request, res: Response) => {
  try {
    const checks = await verifyContracts();
    const allPassed = checks.every((c) => c.passed);
    return ok(res, { checks, allPassed });
  } catch (error) {
    return fail(res, 500, 'Failed to verify contracts');
  }
});

router.post('/contracts/sync-config', async (req: Request, res: Response) => {
  try {
    const { contracts } = req.body;
    await syncEnvConfig(contracts);
    return ok(res, null, { message: 'Config synced successfully' });
  } catch (error) {
    return fail(res, 500, 'Failed to sync config');
  }
});

// ========== 青蛙管理 ==========
router.get('/frogs', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: Record<string, unknown> = {};
    if (search) {
      const searchStr = String(search);
      if (searchStr.startsWith('0x')) {
        where.ownerAddress = { contains: searchStr, mode: 'insensitive' };
      } else if (!isNaN(Number(searchStr))) {
        where.tokenId = Number(searchStr);
      }
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.frog.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { tokenId: 'asc' },
      }),
      prisma.frog.count({ where }),
    ]);

    return ok(res, data, {
      meta: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    return fail(res, 500, 'Failed to fetch frogs');
  }
});

router.get('/frogs/:tokenId', async (req: Request, res: Response) => {
  try {
    const frog = await prisma.frog.findUnique({
      where: { tokenId: Number(req.params.tokenId) },
      include: { travelStats: true },
    });
    if (!frog) {
      return fail(res, 404, 'Frog not found');
    }
    return ok(res, frog);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch frog');
  }
});

router.put('/frogs/:tokenId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const frog = await prisma.frog.update({
      where: { tokenId: Number(req.params.tokenId) },
      data: { status },
    });
    return ok(res, frog, { message: 'Frog status updated' });
  } catch (error) {
    return fail(res, 500, 'Failed to update frog status');
  }
});

// 链上召回青蛙 (Emergency Return)
router.post('/frogs/:tokenId/emergency-return', async (req: Request, res: Response) => {
  try {
    const tokenId = Number(req.params.tokenId);
    
    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({ where: { tokenId } });
    if (!frog) {
      return fail(res, 404, 'Frog not found');
    }
    
    // 检查是否有进行中的跨链旅行
    if (frog.status !== 'Traveling' && frog.status !== 'CrossChainLocked') {
      return fail(res, 400, 'Frog is not in a traveling state');
    }
    
    // 调用合约的 emergencyReturn 方法
    const rpcUrl = process.env.ZETACHAIN_RPC_URL;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const omniTravelAddress = process.env.OMNI_TRAVEL_ADDRESS;
    
    if (!rpcUrl || !privateKey || !omniTravelAddress) {
      return fail(res, 503, 'Contract configuration missing');
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const abi = ['function emergencyReturn(uint256 tokenId) external'];
    const contract = new ethers.Contract(omniTravelAddress, abi, wallet);
    
    // 发送交易
    const tx = await contract.emergencyReturn(tokenId);
    const receipt = await tx.wait();
    
    // 更新数据库状态
    await prisma.frog.update({
      where: { tokenId },
      data: { status: 'Idle' },
    });
    
    // 如果有活跃旅行，标记为完成
    await prisma.travel.updateMany({
      where: {
        frogId: frog.id,
        status: 'Active',
      },
      data: {
        status: 'Completed',
        completedAt: new Date(),
      },
    });
    
    return ok(
      res,
      { txHash: receipt.hash },
      { message: 'Emergency return executed successfully' }
    );
  } catch (error: any) {
    console.error('Emergency return error:', error);
    return fail(res, 500, error.message || 'Failed to execute emergency return');
  }
});

// 重新计算生命状态（Cutover 修复动作）
router.post('/frogs/:tokenId/recalculate-life', async (req: Request, res: Response) => {
  try {
    const tokenId = toOptionalPositiveInt(req.params.tokenId);
    if (!tokenId) {
      return fail(res, 400, 'tokenId must be a positive integer');
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      select: {
        id: true,
        tokenId: true,
        name: true,
        status: true,
        hibernationStatus: true,
      },
    });

    if (!frog) {
      return fail(res, 404, 'Frog not found');
    }

    const life = await lifeCommandService.syncLifeState({ tokenId });
    return ok(
      res,
      {
        frog,
        life,
        recalculatedAt: new Date().toISOString(),
      },
      { message: 'Life state recalculated' }
    );
  } catch (error: any) {
    return fail(res, 500, error?.message || 'Failed to recalculate life state');
  }
});

// ========== 徽章管理 ==========
router.get('/badges', async (req: Request, res: Response) => {
  try {
    const badges = await prisma.travelBadge.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, badges);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch badges');
  }
});

router.post('/badges/sync-definitions', async (req: Request, res: Response) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const result = await badgeMaintenanceService.syncDefinitions({ dryRun });
    return ok(res, result, {
      message: dryRun ? 'Badge definition sync preview completed' : 'Badge definitions synchronized',
    });
  } catch (error: any) {
    return fail(res, 500, error?.message || 'Failed to sync badge definitions');
  }
});

router.post('/badges/backfill', async (req: Request, res: Response) => {
  try {
    const {
      frogId,
      tokenId,
      ownerAddress,
      all = false,
      dryRun = false,
      syncDefinitions = true,
      createRewards = false,
      syncStats = true,
      limit,
    } = req.body ?? {};

    const resolvedFrogId = toOptionalPositiveInt(frogId);
    const resolvedTokenId = toOptionalPositiveInt(tokenId);
    const resolvedLimit = toOptionalPositiveInt(limit);

    if (!all && !resolvedFrogId && !resolvedTokenId && !ownerAddress) {
      return fail(res, 400, 'Provide frogId, tokenId, ownerAddress or set all=true');
    }

    if (all) {
      const result = await badgeMaintenanceService.reconcileAllFrogs({
        dryRun,
        syncDefinitions,
        createRewards,
        syncStats,
        limit: resolvedLimit,
      });
      return ok(res, result, {
        message: dryRun ? 'Badge backfill preview completed' : 'Badge backfill completed',
      });
    }

    if (ownerAddress) {
      const result = await badgeMaintenanceService.reconcileOwnerBadges(ownerAddress, {
        dryRun,
        syncDefinitions,
        createRewards,
        syncStats,
        limit: resolvedLimit,
      });
      return ok(res, result, {
        message: dryRun ? 'Owner badge backfill preview completed' : 'Owner badges backfilled',
      });
    }

    const result = await badgeMaintenanceService.reconcileFrogBadges(
      {
        frogId: resolvedFrogId,
        tokenId: resolvedTokenId,
      },
      {
        dryRun,
        syncDefinitions,
        createRewards,
        syncStats,
      }
    );

    return ok(res, result, {
      message: dryRun ? 'Frog badge backfill preview completed' : 'Frog badges backfilled',
    });
  } catch (error: any) {
    return fail(res, 500, error?.message || 'Failed to backfill badges');
  }
});

router.post('/badges', async (req: Request, res: Response) => {
  try {
    const badge = await prisma.travelBadge.create({
      data: req.body,
    });
    return ok(res, badge, { status: 201 });
  } catch (error) {
    return fail(res, 500, 'Failed to create badge');
  }
});

router.put('/badges/:id', async (req: Request, res: Response) => {
  try {
    const badge = await prisma.travelBadge.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return ok(res, badge, { message: 'Badge updated' });
  } catch (error) {
    return fail(res, 500, 'Failed to update badge');
  }
});

router.delete('/badges/:id', async (req: Request, res: Response) => {
  try {
    await prisma.travelBadge.delete({
      where: { id: req.params.id },
    });
    return ok(res, null, { message: 'Badge deleted' });
  } catch (error) {
    return fail(res, 500, 'Failed to delete badge');
  }
});

// ========== 好友管理 ==========
router.get('/friends', async (req: Request, res: Response) => {
  try {
    const friendships = await prisma.friendship.findMany({
      include: {
        requester: { select: { tokenId: true, name: true } },
        addressee: { select: { tokenId: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = friendships.map((f) => ({
      id: f.id,
      requesterId: f.requesterId,
      addresseeId: f.addresseeId,
      requesterName: f.requester.name,
      addresseeName: f.addressee.name,
      status: f.status,
      affinityLevel: f.affinityLevel,
      groupTravelCount: f.groupTravelCount,
      createdAt: f.createdAt.toISOString().split('T')[0],
    }));

    return ok(res, data);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch friendships');
  }
});

router.delete('/friends/:id', async (req: Request, res: Response) => {
  try {
    await prisma.friendship.delete({
      where: { id: Number(req.params.id) },
    });
    return ok(res, null, { message: 'Friendship deleted' });
  } catch (error) {
    return fail(res, 500, 'Failed to delete friendship');
  }
});

// ========== 旅行管理 ==========
router.get('/travels', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [travels, total] = await Promise.all([
      prisma.travel.findMany({
        where,
        include: { frog: { select: { name: true } } },
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.travel.count({ where }),
    ]);

    const data = travels.map((t) => ({
      id: t.id,
      frogId: t.frogId,
      frogName: t.frog.name,
      targetChain: t.targetChain,
      status: t.status,
      isCrossChain: t.isCrossChain,
      startTime: t.startTime.toISOString().replace('T', ' ').slice(0, 16),
      endTime: t.endTime.toISOString().replace('T', ' ').slice(0, 16),
      duration: t.duration,
    }));

    return ok(res, data, {
      meta: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    return fail(res, 500, 'Failed to fetch travels');
  }
});

// 获取单个旅行详情
router.get('/travels/:id', async (req: Request, res: Response) => {
  try {
    const travel = await prisma.travel.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        frog: { select: { name: true, tokenId: true } },
        discoveries: true,
        observations: true,
      },
    });

    if (!travel) {
      return fail(res, 404, 'Travel not found');
    }

    const detail = {
      id: travel.id,
      frogId: travel.frogId,
      frogName: travel.frog.name,
      targetChain: travel.targetChain,
      targetWallet: travel.targetWallet,
      status: travel.status,
      currentStage: travel.currentStage,
      progress: travel.progress,
      isCrossChain: travel.isCrossChain,
      crossChainStatus: travel.crossChainStatus,
      startTime: travel.startTime.toISOString().replace('T', ' ').slice(0, 16),
      endTime: travel.endTime.toISOString().replace('T', ' ').slice(0, 16),
      duration: travel.duration,
      startTxHash: travel.startTxHash,
      completeTxHash: travel.completeTxHash,
      journalContent: travel.journalContent,
      observedTxCount: travel.observedTxCount,
      observedTotalValue: travel.observedTotalValue,
      discoveries: travel.discoveries.map((d) => ({
        type: d.type,
        title: d.title,
        description: d.description,
        rarity: d.rarity,
      })),
    };

    return ok(res, detail);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch travel detail');
  }
});

router.put('/travels/:id/force-complete', async (req: Request, res: Response) => {
  try {
    const travel = await prisma.travel.update({
      where: { id: Number(req.params.id) },
      data: {
        status: 'Completed',
        completedAt: new Date(),
      },
    });

    // 同时重置青蛙状态
    await prisma.frog.update({
      where: { id: travel.frogId },
      data: { status: 'Idle' },
    });

    return ok(res, null, { message: 'Travel force completed' });
  } catch (error) {
    return fail(res, 500, 'Failed to force complete travel');
  }
});

// 重建记忆宫殿（Cutover 修复动作）
router.post('/travels/:id/rebuild-memory', async (req: Request, res: Response) => {
  try {
    const travelId = toOptionalPositiveInt(req.params.id);
    if (!travelId) {
      return fail(res, 400, 'id must be a positive integer');
    }

    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      select: {
        id: true,
        frogId: true,
        status: true,
      },
    });

    if (!travel) {
      return fail(res, 404, 'Travel not found');
    }

    if (travel.status !== 'Completed') {
      return fail(res, 409, 'Memory rebuild requires a completed travel');
    }

    const requestId = typeof req.body?.requestId === 'string' ? req.body.requestId : undefined;
    const result = await memoryPalaceService.upsertFromTravel({
      travelId,
      requestId,
      source: 'admin.rebuild-memory',
    });

    if (!result) {
      return fail(res, 409, 'Memory rebuild skipped because travel is not eligible');
    }

    return ok(
      res,
      {
        travelId,
        frogId: travel.frogId,
        memoryPalace: result,
        rebuiltAt: new Date().toISOString(),
      },
      { message: 'Memory palace rebuilt' }
    );
  } catch (error: any) {
    return fail(res, 500, error?.message || 'Failed to rebuild memory palace');
  }
});

// ========== 配置管理 ==========
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = {
      rpc: {
        zetachain: process.env.ZETACHAIN_RPC_URL || '',
        bscTestnet: process.env.BSC_TESTNET_RPC_URL || '',
        ethSepolia: process.env.ETH_SEPOLIA_RPC_URL || '',
      },
      contracts: {
        zetaFrogNFT: process.env.ZETAFROG_NFT_ADDRESS || '',
        omniTravel: process.env.OMNI_TRAVEL_ADDRESS || '',
        travel: process.env.TRAVEL_CONTRACT_ADDRESS || '',
        souvenir: process.env.SOUVENIR_NFT_ADDRESS || '',
      },
    };
    return ok(res, config);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch config');
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const { rpc, contracts } = req.body;
    // 实际更新 .env 文件的逻辑（需要谨慎处理）
    // 这里仅返回成功，实际实现需要考虑安全性
    return ok(res, { rpc, contracts }, { message: 'Config updated (restart required)' });
  } catch (error) {
    return fail(res, 500, 'Failed to update config');
  }
});

// ========== 辅助函数 ==========

async function checkChainStatus() {
  const chains = [
    { chainId: 7001, name: 'ZetaChain Athens', rpcUrl: process.env.ZETACHAIN_RPC_URL },
    { chainId: 97, name: 'BSC Testnet', rpcUrl: process.env.BSC_TESTNET_RPC_URL },
    { chainId: 11155111, name: 'ETH Sepolia', rpcUrl: process.env.ETH_SEPOLIA_RPC_URL },
  ];

  const results = await Promise.all(
    chains.map(async (chain) => {
      try {
        if (!chain.rpcUrl) {
          return { ...chain, rpcStatus: 'error' as const };
        }
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const blockNumber = await Promise.race([
          provider.getBlockNumber(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        return { ...chain, rpcStatus: 'connected' as const, blockNumber };
      } catch (error) {
        return { ...chain, rpcStatus: 'timeout' as const };
      }
    })
  );

  return results;
}

function getContractInfo() {
  return [
    {
      name: 'ZetaFrogNFT',
      envKey: 'ZETAFROG_NFT_ADDRESS',
      address: process.env.ZETAFROG_NFT_ADDRESS || '',
      isDeployed: !!process.env.ZETAFROG_NFT_ADDRESS,
      network: 'ZetaChain Athens',
    },
    {
      name: 'OmniTravel',
      envKey: 'OMNI_TRAVEL_ADDRESS',
      address: process.env.OMNI_TRAVEL_ADDRESS || '',
      isDeployed: !!process.env.OMNI_TRAVEL_ADDRESS,
      version: '1.0.0',
      network: 'ZetaChain Athens',
    },
    {
      name: 'Travel',
      envKey: 'TRAVEL_CONTRACT_ADDRESS',
      address: process.env.TRAVEL_CONTRACT_ADDRESS || '',
      isDeployed: !!process.env.TRAVEL_CONTRACT_ADDRESS,
      version: '1.0.0',
      network: 'ZetaChain Athens',
    },
    {
      name: 'SouvenirNFT',
      envKey: 'SOUVENIR_NFT_ADDRESS',
      address: process.env.SOUVENIR_NFT_ADDRESS || '',
      isDeployed: !!process.env.SOUVENIR_NFT_ADDRESS,
      network: 'ZetaChain Athens',
    },
    {
      name: 'BSC Connector',
      envKey: 'BSC_CONNECTOR_ADDRESS',
      address: process.env.BSC_CONNECTOR_ADDRESS || '',
      isDeployed: !!process.env.BSC_CONNECTOR_ADDRESS,
      network: 'BSC Testnet',
    },
    {
      name: 'Sepolia Connector',
      envKey: 'SEPOLIA_CONNECTOR_ADDRESS',
      address: process.env.SEPOLIA_CONNECTOR_ADDRESS || '',
      isDeployed: !!process.env.SEPOLIA_CONNECTOR_ADDRESS,
      network: 'Sepolia',
    },
  ];
}

async function verifyContracts() {
  const checks: { name: string; passed: boolean; message: string }[] = [];

  // 检查 ZetaFrogNFT
  if (process.env.ZETAFROG_NFT_ADDRESS && process.env.ZETACHAIN_RPC_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.ZETACHAIN_RPC_URL);
      const abi = ['function omniTravelContract() view returns (address)', 'function travelContract() view returns (address)'];
      const contract = new ethers.Contract(process.env.ZETAFROG_NFT_ADDRESS, abi, provider);

      const omniTravelAddr = await contract.omniTravelContract();
      const travelAddr = await contract.travelContract();

      checks.push({
        name: 'ZetaFrogNFT.omniTravelContract',
        passed: omniTravelAddr.toLowerCase() === (process.env.OMNI_TRAVEL_ADDRESS || '').toLowerCase(),
        message: omniTravelAddr === process.env.OMNI_TRAVEL_ADDRESS ? '设置正确' : `期望 ${process.env.OMNI_TRAVEL_ADDRESS}，实际 ${omniTravelAddr}`,
      });

      checks.push({
        name: 'ZetaFrogNFT.travelContract',
        passed: travelAddr.toLowerCase() === (process.env.TRAVEL_CONTRACT_ADDRESS || '').toLowerCase(),
        message: travelAddr === process.env.TRAVEL_CONTRACT_ADDRESS ? '设置正确' : `期望 ${process.env.TRAVEL_CONTRACT_ADDRESS}，实际 ${travelAddr}`,
      });
    } catch (error) {
      checks.push({ name: 'ZetaFrogNFT 配置检查', passed: false, message: '检查失败' });
    }
  }

  // 检查 OmniTravel supportedChains
  if (process.env.OMNI_TRAVEL_ADDRESS && process.env.ZETACHAIN_RPC_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.ZETACHAIN_RPC_URL);
      const abi = ['function supportedChains(uint256) view returns (bool)', 'function testMode() view returns (bool)'];
      const contract = new ethers.Contract(process.env.OMNI_TRAVEL_ADDRESS, abi, provider);

      const bscSupported = await contract.supportedChains(97);
      const sepoliaSupported = await contract.supportedChains(11155111);
      const testMode = await contract.testMode();

      checks.push({
        name: 'OmniTravel.supportedChains[97]',
        passed: bscSupported,
        message: bscSupported ? 'BSC Testnet 已启用' : 'BSC Testnet 未启用',
      });

      checks.push({
        name: 'OmniTravel.supportedChains[11155111]',
        passed: sepoliaSupported,
        message: sepoliaSupported ? 'Sepolia 已启用' : 'Sepolia 未启用',
      });

      checks.push({
        name: 'OmniTravel.testMode',
        passed: testMode,
        message: testMode ? '测试模式已开启' : '测试模式未开启',
      });
    } catch (error) {
      checks.push({ name: 'OmniTravel 配置检查', passed: false, message: '检查失败' });
    }
  }

  return checks;
}

async function syncEnvConfig(contracts: Record<string, string>) {
  // 读取并更新 backend/.env
  const backendEnvPath = path.join(__dirname, '../../../.env');
  if (fs.existsSync(backendEnvPath)) {
    let content = fs.readFileSync(backendEnvPath, 'utf-8');
    for (const [key, value] of Object.entries(contracts)) {
      const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${envKey}=${value}`);
      } else {
        content += `\n${envKey}=${value}`;
      }
    }
    fs.writeFileSync(backendEnvPath, content);
  }
}

// ========== 空投管理 ==========

/**
 * GET /api/admin/airdrop/stats
 * 获取空投发放统计
 */
router.get('/airdrop/stats', async (req: Request, res: Response) => {
  try {
    const stats = await airdropService.getStats();
    return ok(res, stats);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch airdrop stats');
  }
});

/**
 * GET /api/admin/airdrop/failed
 * 获取失败的发放记录
 */
router.get('/airdrop/failed', async (req: Request, res: Response) => {
  try {
    const failed = await airdropService.getFailedRewards();
    return ok(res, failed);
  } catch (error) {
    return fail(res, 500, 'Failed to fetch failed rewards');
  }
});

/**
 * POST /api/admin/airdrop/retry/:id
 * 重试失败的发放
 */
router.post('/airdrop/retry/:id', async (req: Request, res: Response) => {
  try {
    if (!airdropService.isEnabled()) {
      return fail(res, 503, 'Airdrop service not configured');
    }
    const result = await airdropService.retryFailedReward(req.params.id);
    return ok(res, result, { message: 'Airdrop retry executed' });
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to retry reward');
  }
});

export default router;
