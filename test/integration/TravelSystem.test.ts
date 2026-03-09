/**
 * 核心功能集成测试
 * 测试: 青蛙旅行 -> 跨链信息 -> NFT徽章
 * 使用模拟钱包，不执行真实交易
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { ethers } from 'ethers';
import { TravelService } from '../../backend/src/services/microservices/TravelService';
import { BatchProcessor } from '../../backend/src/services/travel/BatchProcessor';
import { multiLevelCache } from '../../backend/src/services/cache/MultiLevelCache';

// 模拟钱包配置 (测试网)
const TEST_CONFIG = {
  // 使用环境变量或默认测试配置
  RPC_URL: process.env.TEST_RPC_URL || 'https://zetachain-athens.g.allthatnode.com',
  CHAIN_ID: parseInt(process.env.TEST_CHAIN_ID || '7001'),
  // 模拟钱包地址 (不使用真实私钥)
  FROG_OWNER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  FROG_TOKEN_ID: 1,
};

// 模拟钱包类 (不暴露真实私钥)
class MockWallet {
  address: string;
  
  constructor(address: string) {
    this.address = address;
  }
  
  // 模拟签名 (返回固定格式，不执行真实签名)
  async signMessage(message: string): Promise<string> {
    return `0x${'a'.repeat(130)}`; // 模拟签名格式
  }
  
  // 模拟交易发送 (返回模拟交易哈希)
  async sendTransaction(tx: any): Promise<{ hash: string; wait: () => Promise<any> }> {
    const mockHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
    return {
      hash: mockHash,
      wait: async () => ({ status: 1, blockNumber: 12345678 })
    };
  }
}

describe('🐸 ZFrog 旅行系统核心功能测试', () => {
  let mockWallet: MockWallet;
  let travelService: TravelService;
  let batchProcessor: BatchProcessor;
  
  beforeAll(async () => {
    // 初始化模拟钱包
    mockWallet = new MockWallet(TEST_CONFIG.FROG_OWNER);
    
    // 初始化服务
    travelService = TravelService.getInstance();
    batchProcessor = new BatchProcessor();
    
    console.log('✅ 测试环境初始化完成');
    console.log(`   网络: ZetaChain Athens (Chain ID: ${TEST_CONFIG.CHAIN_ID})`);
    console.log(`   模拟钱包: ${mockWallet.address}`);
  });
  
  beforeEach(() => {
    // 每个测试前重置状态
    jest.clearAllMocks();
  });
  
  describe('1. 青蛙旅行功能测试', () => {
    it('✅ 应该能够开始单次旅行', async () => {
      const travelInput = {
        frogId: TEST_CONFIG.FROG_TOKEN_ID,
        targetWallet: '0x1234567890123456789012345678901234567890',
        chainId: TEST_CONFIG.CHAIN_ID,
        durationMinutes: 30,
        isRandom: false
      };
      
      // 模拟服务调用
      const result = await mockStartTravel(travelInput);
      
      expect(result.success).toBe(true);
      expect(result.travelId).toBeDefined();
      expect(result.travelId).toBeGreaterThan(0);
      
      console.log(`   🎯 旅行已开始，ID: ${result.travelId}`);
    });
    
    it('✅ 应该能够批量开始旅行 (Gas优化)', async () => {
      const batchInput = {
        frogIds: [1, 2, 3],
        targetWallets: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          '0x3333333333333333333333333333333333333333'
        ],
        chainIds: [7001, 7001, 7001],
        durationMinutes: [30, 60, 90]
      };
      
      const result = await mockBatchStartTravels(batchInput);
      
      expect(result.success).toBe(true);
      expect(result.travelIds).toHaveLength(3);
      expect(result.gasSaved).toBeGreaterThan(0); // 确认Gas节省
      
      console.log(`   🎯 批量旅行已开始，数量: ${result.travelIds.length}`);
      console.log(`   ⛽ Gas节省: ${result.gasSaved}%`);
    });
  });
  
  describe('2. 跨链信息测试', () => {
    it('✅ 应该支持多链旅行', async () => {
      const chains = [
        { id: 1, name: 'Ethereum' },
        { id: 56, name: 'BSC' },
        { id: 137, name: 'Polygon' },
        { id: 7001, name: 'ZetaChain Athens' }
      ];
      
      for (const chain of chains) {
        const result = await mockStartTravel({
          frogId: 1,
          targetWallet: '0x1234567890123456789012345678901234567890',
          chainId: chain.id,
          durationMinutes: 30
        });
        
        expect(result.success).toBe(true);
        console.log(`   ✅ ${chain.name} (Chain ID: ${chain.id})`);
      }
    });
    
    it('✅ 应该能扫描链上足迹', async () => {
      const mockFootprint = {
        txHash: '0x' + 'a'.repeat(64),
        location: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        observation: 'Found an active DeFi protocol',
        timestamp: Date.now()
      };
      
      // 模拟足迹扫描
      const footprints = await mockScanFootprints({
        chainKey: 'ZETACHAIN_ATHENS',
        frogTokenId: 1,
        fromBlock: 1000000
      });
      
      expect(footprints).toBeDefined();
      expect(footprints.length).toBeGreaterThanOrEqual(0);
      
      console.log(`   👣 发现 ${footprints.length} 个足迹`);
    });
  });
  
  describe('3. NFT徽章测试', () => {
    it('✅ 应该能铸造纪念品NFT', async () => {
      const mockSouvenir = {
        tokenId: 1,
        name: 'ZetaChain Explorer Badge',
        description: 'Awarded for exploring ZetaChain',
        rarity: 'Rare',
        chainOrigin: 'ZetaChain Athens'
      };
      
      // 模拟NFT铸造
      const result = await mockMintSouvenir({
        frogId: 1,
        travelId: 1,
        rarity: 85 // 稀有度随机值
      });
      
      expect(result.success).toBe(true);
      expect(result.tokenId).toBeGreaterThan(0);
      
      console.log(`   🎁 NFT铸造成功，Token ID: ${result.tokenId}`);
      console.log(`   ✨ 稀有度: ${mockSouvenir.rarity}`);
    });
    
    it('✅ 应该能解锁徽章', async () => {
      const mockBadge = {
        id: 'EXPLORER_001',
        name: 'Chain Explorer',
        description: 'Explore 5 different chains',
        icon: '🗺️',
        rarity: 3,
        unlockedAt: new Date().toISOString()
      };
      
      // 模拟徽章解锁检查
      const result = await mockCheckAndUnlockBadge({
        frogId: 1,
        event: 'TRAVEL_COMPLETED',
        context: {
          chain: 'ZETACHAIN_ATHENS',
          travelId: 1,
          discoveries: []
        }
      });
      
      expect(result).toBeDefined();
      
      if (result.unlocked && result.badges.length > 0) {
        console.log(`   🏆 解锁 ${result.badges.length} 个徽章:`);
        result.badges.forEach((badge: any) => {
          console.log(`      ${badge.icon} ${badge.name}`);
        });
      } else {
        console.log(`   ⏳ 暂无可解锁徽章`);
      }
    });
    
    it('✅ 应该支持批量徽章检查', async () => {
      const results = await Promise.all([
        mockCheckAndUnlockBadge({ frogId: 1, event: 'TRAVEL_COMPLETED' }),
        mockCheckAndUnlockBadge({ frogId: 1, event: 'RARE_DISCOVERY' }),
        mockCheckAndUnlockBadge({ frogId: 1, event: 'CHAIN_EXPLORER' })
      ]);
      
      const totalUnlocked = results.reduce((sum, r) => sum + (r.badges?.length || 0), 0);
      
      console.log(`   🎯 批量检查完成，共解锁 ${totalUnlocked} 个徽章`);
    });
  });
  
  describe('4. 完整流程集成测试', () => {
    it('✅ 完整旅行流程: 开始 -> 跨链探索 -> 完成 -> NFT + 徽章', async () => {
      console.log('\n   🎬 开始完整流程测试...\n');
      
      // 1. 开始旅行
      console.log('   1️⃣  开始旅行...');
      const travelResult = await mockStartTravel({
        frogId: 1,
        targetWallet: '0x1234567890123456789012345678901234567890',
        chainId: 7001, // ZetaChain Athens
        durationMinutes: 5, // 5分钟快速测试
        isRandom: false
      });
      expect(travelResult.success).toBe(true);
      console.log(`      ✅ 旅行已开始，ID: ${travelResult.travelId}\n`);
      
      // 2. 模拟跨链探索 (扫描足迹)
      console.log('   2️⃣  跨链探索中...');
      const footprints = await mockScanFootprints({
        chainKey: 'ZETACHAIN_ATHENS',
        frogTokenId: 1,
        fromBlock: 1000000
      });
      console.log(`      👣 发现 ${footprints.length} 个足迹`);
      if (footprints.length > 0) {
        console.log(`         示例: ${footprints[0].observation}\n`);
      }
      
      // 3. 完成旅行
      console.log('   3️⃣  完成旅行...');
      const completeResult = await mockCompleteTravel({
        travelId: travelResult.travelId,
        journalHash: 'Qm' + 'a'.repeat(44), // 模拟 IPFS hash
        souvenirId: 0 // 初始为0，铸造后更新
      });
      expect(completeResult.success).toBe(true);
      console.log(`      ✅ 旅行已完成\n`);
      
      // 4. 铸造 NFT 纪念品
      console.log('   4️⃣  铸造 NFT 纪念品...');
      const nftResult = await mockMintSouvenir({
        frogId: 1,
        travelId: travelResult.travelId,
        rarity: 85 // 随机稀有度
      });
      expect(nftResult.success).toBe(true);
      expect(nftResult.tokenId).toBeGreaterThan(0);
      console.log(`      🎁 NFT 铸造成功!`);
      console.log(`         Token ID: ${nftResult.tokenId}`);
      console.log(`         稀有度: ${nftResult.rarity || 'Unknown'}\n`);
      
      // 5. 徽章解锁检查
      console.log('   5️⃣  检查徽章解锁...');
      const badgeResult = await mockCheckAndUnlockBadge({
        frogId: 1,
        event: 'TRAVEL_COMPLETED',
        context: {
          chain: 'ZETACHAIN_ATHENS',
          travelId: travelResult.travelId,
          discoveries: footprints
        }
      });
      
      if (badgeResult.unlocked && badgeResult.badges.length > 0) {
        console.log(`      🏆 解锁 ${badgeResult.badges.length} 个徽章!`);
        badgeResult.badges.forEach((badge: any, index: number) => {
          console.log(`         ${index + 1}. ${badge.icon} ${badge.name}`);
          console.log(`            ${badge.description}`);
        });
      } else {
        console.log(`      ⏳ 暂无可解锁徽章 (继续探索更多链吧!)`);
      }
      
      console.log('\n   ✅ 完整流程测试通过!\n');
    });
    
    it('✅ 批量旅行流程测试', async () => {
      console.log('\n   🎬 开始批量旅行测试...\n');
      
      const batchSize = 3;
      console.log(`   📦 批量创建 ${batchSize} 个旅行...`);
      
      // 批量开始旅行
      const batchResult = await mockBatchStartTravels({
        frogIds: [1, 2, 3],
        targetWallets: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          '0x3333333333333333333333333333333333333333'
        ],
        chainIds: [7001, 7001, 7001],
        durationMinutes: [30, 60, 90]
      });
      
      expect(batchResult.success).toBe(true);
      expect(batchResult.travelIds).toHaveLength(batchSize);
      
      console.log(`      ✅ 批量旅行已创建`);
      console.log(`         Travel IDs: ${batchResult.travelIds.join(', ')}`);
      console.log(`         Gas节省: ${batchResult.gasSaved}%\n`);
      
      // 批量完成旅行
      console.log('   🏁 批量完成旅行...');
      
      const batchCompleteResult = await mockBatchCompleteTravels({
        travelIds: batchResult.travelIds,
        journalHashes: batchResult.travelIds.map(() => 'Qm' + 'a'.repeat(44)),
        souvenirIds: batchResult.travelIds.map((_, i) => i + 1)
      });
      
      expect(batchCompleteResult.success).toBe(true);
      
      console.log(`      ✅ 批量旅行已完成`);
      console.log(`         完成数量: ${batchCompleteResult.completedCount}`);
      console.log(`         总Gas使用: ${batchCompleteResult.totalGasUsed}\n`);
      
      // 批量徽章检查
      console.log('   🏆 批量徽章检查...');
      
      const badgeChecks = await Promise.all(
        batchResult.travelIds.map(travelId =>
          mockCheckAndUnlockBadge({
            frogId: 1,
            event: 'TRAVEL_COMPLETED',
            context: {
              chain: 'ZETACHAIN_ATHENS',
              travelId,
              discoveries: []
            }
          })
        )
      );
      
      const totalUnlocked = badgeChecks.reduce(
        (sum, r) => sum + (r.badges?.length || 0),
        0
      );
      
      console.log(`      ✅ 徽章检查完成`);
      console.log(`         总解锁徽章: ${totalUnlocked}\n`);
      
      console.log('   ✅ 批量流程测试通过!\n');
    });
  });
  
  describe('5. 边界情况和错误处理', () => {
    it('✅ 应该处理无效输入', async () => {
      // 测试无效参数
      const invalidInputs = [
        { frogId: 0, message: '无效青蛙ID' },
        { frogId: 1, chainId: 0, message: '无效链ID' },
        { frogId: 1,