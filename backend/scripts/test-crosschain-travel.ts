/**
 * Cross-Chain Travel End-to-End Test Script
 * 
 * 使用私钥钱包测试完整的跨链旅行流程
 * 监听链上事件和 WebSocket 推送
 * 
 * 运行方式: npx ts-node scripts/test-crosschain-travel.ts
 */

import { ethers } from 'ethers';
import { io, Socket } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

// ============ 配置 ============
const ZETACHAIN_RPC_URLS = [
  process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm/0d35aeffdccb405fb831f6539c284afd',
];

const CONFIG = {
  // RPC URLs (from env or defaults)
  ZETACHAIN_RPC: ZETACHAIN_RPC_URLS[0],
  BSC_RPC: process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.g.allthatnode.com/full/evm/0d35aeffdccb405fb831f6539c284afd',
  SEPOLIA_RPC: process.env.ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.g.allthatnode.com/full/evm/0d35aeffdccb405fb831f6539c284afd',
  
  // Contract Addresses
  OMNI_TRAVEL: '0xE36713321E988d237D940A25BAb7Ad509f4f1387',
  ZETAFROG_NFT: '0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f',
  BSC_CONNECTOR: '0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674',
  SEPOLIA_CONNECTOR: '0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a',
  
  // Backend
  API_URL: 'http://localhost:3001',
  WS_URL: 'http://localhost:3001',
  
  // Test Parameters
  FROG_TOKEN_ID: 14, // 指定测试用的青蛙 Token ID
  TARGET_CHAIN_ID: 97, // BSC Testnet
  TRAVEL_DURATION_SECONDS: 60, // 10 minutes for testing (in seconds)
};

// ============ ABIs ============
const OMNI_TRAVEL_ABI = [
  'function startCrossChainTravel(uint256 tokenId, uint256 targetChainId, uint256 duration) payable',
  'function getActiveTravel(uint256 tokenId) view returns (tuple(uint256 tokenId, uint256 destinationChainId, uint256 startTime, uint256 provisions, bool isActive, uint256 duration))',
  'function calculateProvisions(uint256 durationHours) view returns (uint256)',
  'event TravelStarted(uint256 indexed tokenId, uint256 indexed chainId, uint256 duration, uint256 provisions)',
  'event TravelCompleted(uint256 indexed tokenId, bool success)',
];

const ZETAFROG_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getFrogStatus(uint256 tokenId) view returns (uint8)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
];

const FROG_CONNECTOR_ABI = [
  'function visitingFrogs(uint256 tokenId) view returns (tuple(uint256 tokenId, uint256 arrivalTime, uint256 provisions, address sourceOwner))',
  'event FrogArrived(uint256 indexed tokenId, address sourceOwner, uint256 provisions)',
  'event RandomExploration(uint256 indexed tokenId, address indexed exploredAddress, bool isContract, uint256 codeSize)',
  'event FrogReturned(uint256 indexed tokenId)',
];

// ============ 工具函数 ============
function log(tag: string, message: string, data?: any) {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  const prefix = `[${timestamp}] [${tag}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============ 主测试类 ============
class CrossChainTravelTester {
  private wallet: ethers.Wallet;
  private zetaProvider: ethers.JsonRpcProvider;
  private bscProvider: ethers.JsonRpcProvider;
  private omniTravel: ethers.Contract;
  private zetaFrog: ethers.Contract;
  private bscConnector: ethers.Contract;
  private socket: Socket | null = null;
  private tokenId: number = 0;

  constructor() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }

    // Initialize providers
    this.zetaProvider = new ethers.JsonRpcProvider(CONFIG.ZETACHAIN_RPC);
    this.bscProvider = new ethers.JsonRpcProvider(CONFIG.BSC_RPC);
    
    // Suppress "filter not found" errors (filter expiry is normal)
    this.zetaProvider.on('error', (error: any) => {
      if (error?.code === 'UNKNOWN_ERROR' && error?.error?.message?.includes('filter')) {
        // Silently ignore filter expiry errors
        return;
      }
      console.error('[ZetaProvider Error]', error.message || error);
    });
    
    this.bscProvider.on('error', (error: any) => {
      if (error?.code === 'UNKNOWN_ERROR' && error?.error?.message?.includes('filter')) {
        // Silently ignore filter expiry errors
        return;
      }
      console.error('[BscProvider Error]', error.message || error);
    });

    // Initialize wallet
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    this.wallet = new ethers.Wallet(key, this.zetaProvider);

    // Initialize contracts
    this.omniTravel = new ethers.Contract(CONFIG.OMNI_TRAVEL, OMNI_TRAVEL_ABI, this.wallet);
    this.zetaFrog = new ethers.Contract(CONFIG.ZETAFROG_NFT, ZETAFROG_ABI, this.wallet);
    this.bscConnector = new ethers.Contract(CONFIG.BSC_CONNECTOR, FROG_CONNECTOR_ABI, this.bscProvider);

    log('INIT', `Wallet address: ${this.wallet.address}`);
  }

  // ============ 步骤1: 检查准备条件 ============
  async checkPrerequisites(): Promise<boolean> {
    logSection('步骤 1: 检查准备条件');

    try {
      // 使用配置的 Token ID
      this.tokenId = CONFIG.FROG_TOKEN_ID;
      log('CHECK', `使用指定青蛙 Token ID: ${this.tokenId}`);
      
      // 检查 ZETA 余额
      const balance = await this.zetaProvider.getBalance(this.wallet.address);
      log('CHECK', `ZETA 余额: ${ethers.formatEther(balance)} ZETA`);
      
      if (balance < ethers.parseEther('0.1')) {
        log('ERROR', '余额不足，需要至少 0.1 ZETA');
        return false;
      }

      // 验证青蛙所有权
      try {
        const owner = await this.zetaFrog.ownerOf(this.tokenId);
        if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
          log('ERROR', `青蛙 #${this.tokenId} 不属于当前钱包`);
          log('INFO', `所有者: ${owner}`);
          log('INFO', `当前钱包: ${this.wallet.address}`);
          return false;
        }
        log('CHECK', `✅ 青蛙所有权验证通过`);
      } catch (error: any) {
        log('ERROR', `青蛙 #${this.tokenId} 不存在或无法查询`);
        return false;
      }

      // 检查青蛙状态
      const frogStatus = await this.zetaFrog.getFrogStatus(this.tokenId);
      const statusMap = ['Idle', 'Traveling', 'CrossChainLocked'];
      log('CHECK', `青蛙状态: ${statusMap[frogStatus] || frogStatus}`);
      
      if (frogStatus !== 0) {
        log('WARNING', '青蛙不在空闲状态，可能无法发起新旅行');
      }

      // 检查授权
      const isApproved = await this.zetaFrog.isApprovedForAll(this.wallet.address, CONFIG.OMNI_TRAVEL);
      log('CHECK', `OmniTravel 授权状态: ${isApproved ? '✅ 已授权' : '❌ 未授权'}`);

      if (!isApproved) {
        log('ACTION', '正在授权 OmniTravel 合约...');
        const tx = await this.zetaFrog.setApprovalForAll(CONFIG.OMNI_TRAVEL, true);
        await tx.wait();
        log('SUCCESS', '授权成功');
      }

      return true;
    } catch (error: any) {
      log('ERROR', '检查准备条件失败:', error.message);
      return false;
    }
  }

  // ============ 步骤2: 连接 WebSocket ============
  connectWebSocket(): Promise<void> {
    logSection('步骤 2: 连接 WebSocket');

    return new Promise((resolve, reject) => {
      this.socket = io(CONFIG.WS_URL, {
        transports: ['websocket'],
        auth: { walletAddress: this.wallet.address },
      });

      this.socket.on('connect', () => {
        log('WS', '✅ WebSocket 连接成功');
        this.socket!.emit('subscribe:frog', this.tokenId);
        log('WS', `已订阅青蛙 #${this.tokenId} 的事件`);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        log('WS', '❌ 连接失败:', error.message);
        reject(error);
      });

      // 监听旅行事件
      this.socket.on('travel:started', (data) => {
        log('WS:EVENT', '🚀 旅行开始', data);
      });

      this.socket.on('travel:interaction', (data) => {
        log('WS:EVENT', '🐾 探索互动', {
          地址: data.exploredAddress,
          区块: data.blockNumber,
          是否合约: data.isContract ? '是' : '否',
          消息: data.message?.substring(0, 50) + '...',
        });
      });

      this.socket.on('travel:stageUpdate', (data) => {
        log('WS:EVENT', '📍 阶段更新', data);
      });

      this.socket.on('travel:completed', (data) => {
        log('WS:EVENT', '🎉 旅行完成', data);
      });

      this.socket.on('travel:discovery', (data) => {
        log('WS:EVENT', '💎 发现', data);
      });

      setTimeout(() => reject(new Error('WebSocket 连接超时')), 10000);
    });
  }

  // ============ 步骤3: 发起跨链旅行 ============
  async startCrossChainTravel(): Promise<string | null> {
    logSection('步骤 3: 发起跨链旅行');

    try {
      // Convert duration to hours for fee calculation (minimum 1 hour for provisions calculation)
      const durationHours = Math.max(1, Math.ceil(CONFIG.TRAVEL_DURATION_SECONDS / 3600));
      const fee = await this.omniTravel.calculateProvisions(durationHours);
      log('CALC', `所需干粮费 (${durationHours}小时): ${ethers.formatEther(fee)} ZETA`);

      // 增加一些额外的 gas 费用
      const totalValue = fee + ethers.parseEther('0.05');
      log('CALC', `总发送金额: ${ethers.formatEther(totalValue)} ZETA`);

      // 发起交易
      log('TX', '正在发送交易...');
      const tx = await this.omniTravel.startCrossChainTravel(
        this.tokenId,
        CONFIG.TARGET_CHAIN_ID,
        CONFIG.TRAVEL_DURATION_SECONDS,
        { value: totalValue }
      );

      log('TX', `交易已发送: ${tx.hash}`);
      log('TX', '等待确认中...');

      const receipt = await tx.wait();
      log('SUCCESS', `✅ 交易确认! Gas 消耗: ${receipt.gasUsed.toString()}`);

      // 解析事件
      const travelStartedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.omniTravel.interface.parseLog(log);
          return parsed?.name === 'TravelStarted';
        } catch {
          return false;
        }
      });

      if (travelStartedEvent) {
        const parsed = this.omniTravel.interface.parseLog(travelStartedEvent);
        log('EVENT', '📣 TravelStarted 事件', {
          tokenId: parsed?.args.tokenId.toString(),
          chainId: parsed?.args.chainId.toString(),
          duration: parsed?.args.duration.toString(),
        });
      }

      return tx.hash;
    } catch (error: any) {
      log('ERROR', '发起旅行失败:', error.message);
      return null;
    }
  }

  // ============ 步骤4: 监听链上事件 ============
  async monitorOnChainEvents(durationSeconds: number): Promise<void> {
    logSection('步骤 4: 监听链上事件 (原生订阅模式)');

    log('MONITOR', `开始监听 ${durationSeconds} 秒...`);
    log('INFO', '使用 contract.on() 原生事件订阅 (allthatnode API)');

    // 监听 ZetaChain 上的 OmniTravel 事件
    this.omniTravel.on('TravelStarted', (tokenId: any, chainId: any, duration: any, provisions: any) => {
      log('CHAIN:ZETA', '🚀 TravelStarted', {
        tokenId: tokenId.toString(),
        chainId: chainId.toString(),
        duration: duration.toString(),
      });
    });

    this.omniTravel.on('TravelCompleted', (tokenId: any, success: any) => {
      log('CHAIN:ZETA', '🏁 TravelCompleted', { tokenId: tokenId.toString(), success });
    });

    // 监听 BSC 上的 FrogConnector 事件  
    this.bscConnector.on('FrogArrived', (tokenId: any, sourceOwner: any, provisions: any) => {
      log('CHAIN:BSC', '🐸 FrogArrived', {
        tokenId: tokenId.toString(),
        sourceOwner,
        provisions: provisions.toString(),
      });
    });

    this.bscConnector.on('RandomExploration', (tokenId: any, exploredAddress: any, isContract: any, codeSize: any) => {
      log('CHAIN:BSC', '🔍 RandomExploration', {
        tokenId: tokenId.toString(),
        address: exploredAddress,
        isContract,
        codeSize: codeSize.toString(),
      });
    });

    this.bscConnector.on('FrogReturned', (tokenId: any) => {
      log('CHAIN:BSC', '↩️ FrogReturned', { tokenId: tokenId.toString() });
    });

    log('LISTEN', '✅ 已设置链上事件监听器 (ZetaChain + BSC)');

    // 定期检查后端状态
    const statusInterval = setInterval(async () => {
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/cross-chain/travel/status/${this.tokenId}`);
        const data = await response.json();
        if (data.success && data.data) {
          log('API:STATUS', '📊 当前状态', {
            stage: data.data.crossChainStatus,
            progress: `${data.data.progress}%`,
            remaining: data.data.remainingTime,
          });
        }
      } catch {
        // Ignore
      }
    }, 30000);

    // 等待指定时间
    const startTime = Date.now();
    while ((Date.now() - startTime) < durationSeconds * 1000) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = durationSeconds - elapsed;
      if (remaining > 0 && remaining % 60 === 0) {
        log('TIMER', `⏱️ 剩余时间: ${remaining} 秒`);
      }
    }

    // 清理
    clearInterval(statusInterval);
    this.omniTravel.removeAllListeners();
    this.bscConnector.removeAllListeners();
    log('MONITOR', '监听结束');
  }

  // ============ 步骤5: 检查最终结果 ============
  async checkFinalResult(): Promise<void> {
    logSection('步骤 5: 检查最终结果');

    try {
      // 检查青蛙状态
      const frogStatus = await this.zetaFrog.getFrogStatus(this.tokenId);
      const statusMap = ['Idle', 'Traveling', 'CrossChainLocked'];
      log('RESULT', `青蛙状态: ${statusMap[frogStatus] || frogStatus}`);

      // 检查活跃旅行
      const activeTravel = await this.omniTravel.getActiveTravel(this.tokenId);
      log('RESULT', '活跃旅行信息', {
        tokenId: activeTravel.tokenId.toString(),
        chainId: activeTravel.destinationChainId.toString(),
        isActive: activeTravel.isActive,
        startTime: new Date(Number(activeTravel.startTime) * 1000).toLocaleString(),
      });

      // 检查数据库中的旅行记录
      const response = await fetch(`${CONFIG.API_URL}/api/frogs/${this.tokenId}`);
      const data = await response.json();
      if (data.success && data.data?.travels?.length > 0) {
        const latestTravel = data.data.travels[0];
        log('RESULT', '数据库旅行记录', {
          id: latestTravel.id,
          status: latestTravel.status,
          chainId: latestTravel.chainId,
          isCrossChain: latestTravel.isCrossChain,
        });
      }

    } catch (error: any) {
      log('ERROR', '检查结果失败:', error.message);
    }
  }

  // ============ 清理 ============
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      log('CLEANUP', 'WebSocket 已断开');
    }
  }

  // ============ 运行测试 ============
  async run() {
    logSection('🐸 ZetaFrog 跨链旅行测试开始');
    log('INFO', `目标链: BSC Testnet (Chain ID: ${CONFIG.TARGET_CHAIN_ID})`);
    log('INFO', `旅行时长: ${CONFIG.TRAVEL_DURATION_SECONDS} 秒`);

    try {
      // 步骤1: 检查准备条件
      const ready = await this.checkPrerequisites();
      if (!ready) {
        log('ABORT', '准备条件不满足，测试终止');
        return;
      }

      // 步骤2: 连接 WebSocket
      await this.connectWebSocket();

      // 步骤3: 发起跨链旅行
      const txHash = await this.startCrossChainTravel();
      if (!txHash) {
        log('ABORT', '发起旅行失败，测试终止');
        return;
      }

      // 步骤4: 监听事件 (监听时间 = 旅行时间 + 60秒缓冲)
      await this.monitorOnChainEvents(CONFIG.TRAVEL_DURATION_SECONDS + 60);

      // 步骤5: 检查最终结果
      await this.checkFinalResult();

    } catch (error: any) {
      log('FATAL', '测试过程发生错误:', error.message);
    } finally {
      this.cleanup();
      logSection('🐸 测试完成');
    }
  }
}

// ============ 入口 ============
const tester = new CrossChainTravelTester();
tester.run().catch(console.error);
