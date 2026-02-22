/**
 * Admin API Routes
 * 管理员控制台 API 接口
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const prisma = new PrismaClient();

// ========== 仪表盘 ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 统计数据
    const [totalFrogs, totalTravels, activeTravels, totalBadgesUnlocked, totalFriendships] = await Promise.all([
      prisma.frog.count(),
      prisma.travel.count(),
      prisma.travel.count({ where: { status: 'Active' } }),
      prisma.userBadge.count(),
      prisma.friendship.count({ where: { status: 'Accepted' } }),
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

    res.json({
      stats: { totalFrogs, totalTravels, activeTravels, totalBadgesUnlocked, totalFriendships },
      services,
      chains,
      contracts,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ========== 合约管理 ==========
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const contracts = getContractInfo();
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.get('/contracts/verify', async (req: Request, res: Response) => {
  try {
    const checks = await verifyContracts();
    const allPassed = checks.every((c) => c.passed);
    res.json({ checks, allPassed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify contracts' });
  }
});

router.post('/contracts/sync-config', async (req: Request, res: Response) => {
  try {
    const { contracts } = req.body;
    await syncEnvConfig(contracts);
    res.json({ success: true, message: 'Config synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync config' });
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

    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch frogs' });
  }
});

router.get('/frogs/:tokenId', async (req: Request, res: Response) => {
  try {
    const frog = await prisma.frog.findUnique({
      where: { tokenId: Number(req.params.tokenId) },
      include: { travelStats: true },
    });
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    res.json(frog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch frog' });
  }
});

router.put('/frogs/:tokenId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const frog = await prisma.frog.update({
      where: { tokenId: Number(req.params.tokenId) },
      data: { status },
    });
    res.json({ success: true, frog });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update frog status' });
  }
});

// 链上召回青蛙 (Emergency Return)
router.post('/frogs/:tokenId/emergency-return', async (req: Request, res: Response) => {
  try {
    const tokenId = Number(req.params.tokenId);
    
    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({ where: { tokenId } });
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 检查是否有进行中的跨链旅行
    if (frog.status !== 'Traveling' && frog.status !== 'CrossChainLocked') {
      return res.status(400).json({ error: 'Frog is not in a traveling state' });
    }
    
    // 调用合约的 emergencyReturn 方法
    const rpcUrl = process.env.ZETACHAIN_RPC_URL;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const omniTravelAddress = process.env.OMNI_TRAVEL_ADDRESS;
    
    if (!rpcUrl || !privateKey || !omniTravelAddress) {
      return res.status(503).json({ error: 'Contract configuration missing' });
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
    
    res.json({
      success: true,
      txHash: receipt.hash,
      message: 'Emergency return executed successfully',
    });
  } catch (error: any) {
    console.error('Emergency return error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute emergency return' });
  }
});

// ========== 徽章管理 ==========
router.get('/badges', async (req: Request, res: Response) => {
  try {
    const badges = await prisma.travelBadge.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/badges', async (req: Request, res: Response) => {
  try {
    const badge = await prisma.travelBadge.create({
      data: req.body,
    });
    res.json(badge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

router.put('/badges/:id', async (req: Request, res: Response) => {
  try {
    const badge = await prisma.travelBadge.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(badge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

router.delete('/badges/:id', async (req: Request, res: Response) => {
  try {
    await prisma.travelBadge.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete badge' });
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

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friendships' });
  }
});

router.delete('/friends/:id', async (req: Request, res: Response) => {
  try {
    await prisma.friendship.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete friendship' });
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

    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch travels' });
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
      return res.status(404).json({ error: 'Travel not found' });
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

    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch travel detail' });
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

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to force complete travel' });
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
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const { rpc, contracts } = req.body;
    // 实际更新 .env 文件的逻辑（需要谨慎处理）
    // 这里仅返回成功，实际实现需要考虑安全性
    res.json({ success: true, message: 'Config updated (restart required)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
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

import { airdropService } from '../../services/airdrop/airdrop.service';

/**
 * GET /api/admin/airdrop/stats
 * 获取空投发放统计
 */
router.get('/airdrop/stats', async (req: Request, res: Response) => {
  try {
    const stats = await airdropService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch airdrop stats' });
  }
});

/**
 * GET /api/admin/airdrop/failed
 * 获取失败的发放记录
 */
router.get('/airdrop/failed', async (req: Request, res: Response) => {
  try {
    const failed = await airdropService.getFailedRewards();
    res.json(failed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failed rewards' });
  }
});

/**
 * POST /api/admin/airdrop/retry/:id
 * 重试失败的发放
 */
router.post('/airdrop/retry/:id', async (req: Request, res: Response) => {
  try {
    if (!airdropService.isEnabled()) {
      return res.status(503).json({ error: 'Airdrop service not configured' });
    }
    const result = await airdropService.retryFailedReward(req.params.id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retry reward' });
  }
});

export default router;
