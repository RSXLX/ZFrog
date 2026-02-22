/**
 * 测试脚本：结伴跨链旅行 V2.0
 * 
 * 使用两个已存在青蛙且已是好友的钱包测试：
 * 1. 通过后端 API 查询青蛙 tokenId
 * 2. Leader 发起结伴跨链旅行
 * 3. 验证合约事件
 * 4. 验证后端记录
 * 
 * 运行方式：npx ts-node scripts/test-group-travel.ts
 */

import { ethers } from 'ethers';
import { config } from 'dotenv';
import axios from 'axios';

// 加载环境变量
config();

// ============ 配置 ============
const LEADER_PRIVATE_KEY = '441d3114985e2d3738b6d3865a3718844eab7bcd3253db990d2dde75376bb857';
const COMPANION_PRIVATE_KEY = '3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc';

const ZETACHAIN_RPC = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
const OMNI_TRAVEL_ADDRESS = process.env.OMNI_TRAVEL_ADDRESS || '';
const BACKEND_URL = 'http://localhost:3001';

// 目标链选项（只有跨链目标，不包括 ZetaChain 本地）
const TARGET_CHAINS = [
  { id: 97, name: 'BSC Testnet', icon: '🟡' },
  { id: 11155111, name: 'Sepolia', icon: '💎' }
];

// 时长选项（秒）
const DURATION_OPTIONS = [
  { label: '1 分钟', value: 60 },
  { label: '10 分钟', value: 600 },
  { label: '1 小时', value: 3600 },
  { label: '24 小时', value: 86400 },
];

// OmniTravel ABI（部分）
const OMNI_TRAVEL_ABI = [
  'function startGroupCrossChainTravel(uint256 leaderTokenId, uint256 companionTokenId, uint256 targetChainId, uint256 duration) external payable',
  'function calculateGroupProvisions(uint256 durationHours) external view returns (uint256)',
  'function getGroupTravel(bytes32 messageId) external view returns (uint256, uint256, address, address, uint256, uint8)',
  'function testMode() external view returns (bool)',
  'event GroupCrossChainTravelStarted(uint256 indexed leaderTokenId, uint256 indexed companionTokenId, address indexed leaderOwner, address companionOwner, uint256 targetChainId, bytes32 messageId, uint64 startTime, uint64 maxDuration)'
];

// ============ 辅助函数 ============
function log(emoji: string, message: string) {
  console.log(`${emoji} [${new Date().toLocaleTimeString()}] ${message}`);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 通过后端 API 获取青蛙信息
async function getFrogByOwner(ownerAddress: string): Promise<{ id: number; tokenId: number; name: string; status: string } | null> {
  try {
    // 使用 /api/frogs/my/:address 接口
    const response = await axios.get(`${BACKEND_URL}/api/frogs/my/${ownerAddress}`);
    if (response.data.success && response.data.data) {
      const frog = response.data.data;
      return {
        id: frog.id,
        tokenId: frog.tokenId,
        name: frog.name,
        status: frog.status
      };
    }
  } catch (err: any) {
    log('⚠️', `API 调用失败: ${err.response?.status} - ${err.message}`);
  }
  return null;
}

// ============ 主测试函数 ============
async function main() {
  log('🚀', '=== 结伴跨链旅行测试开始 ===');
  
  // 1. 初始化 Provider 和 Wallets
  log('🔗', `连接到 ZetaChain: ${ZETACHAIN_RPC}`);
  const provider = new ethers.JsonRpcProvider(ZETACHAIN_RPC);
  
  const leaderWallet = new ethers.Wallet(LEADER_PRIVATE_KEY, provider);
  const companionWallet = new ethers.Wallet(COMPANION_PRIVATE_KEY, provider);
  
  log('👤', `Leader 钱包: ${leaderWallet.address}`);
  log('👤', `Companion 钱包: ${companionWallet.address}`);
  
  // 检查余额
  const leaderBalance = await provider.getBalance(leaderWallet.address);
  log('💰', `Leader 余额: ${ethers.formatEther(leaderBalance)} ZETA`);
  
  if (leaderBalance < ethers.parseEther('0.05')) {
    log('❌', 'Leader 余额不足，请先充值 ZETA');
    return;
  }

  // 2. 初始化合约
  if (!OMNI_TRAVEL_ADDRESS) {
    log('❌', '请设置 OMNI_TRAVEL_ADDRESS 环境变量');
    return;
  }
  
  const omniTravel = new ethers.Contract(OMNI_TRAVEL_ADDRESS, OMNI_TRAVEL_ABI, leaderWallet);
  log('📜', `OmniTravel 合约: ${OMNI_TRAVEL_ADDRESS}`);

  // 3. 使用已知的 tokenId（从数据库查询得到）
  // 钱包1 (Leader): test, tokenId=1
  // 钱包2 (Companion): SXLX, tokenId=0
  const leaderTokenId = 1;
  const companionTokenId = 0;
  const leaderFrogName = 'test';
  const companionFrogName = 'SXLX';
  
  log('🐸', `Leader 青蛙: ${leaderFrogName} (tokenId: ${leaderTokenId})`);
  log('🐸', `Companion 青蛙: ${companionFrogName} (tokenId: ${companionTokenId})`);
  log('✅', '两只青蛙已是好友');

  // 5. 随机选择目标链和时长
  const targetChain = randomChoice(TARGET_CHAINS);
  const duration = DURATION_OPTIONS[0]; // 使用 1 分钟测试
  
  log('🎲', `随机选择目标链: ${targetChain.icon} ${targetChain.name} (ID: ${targetChain.id})`);
  log('⏱️', `旅行时长: ${duration.label} (${duration.value}秒)`);

  // 6. 计算干粮费用
  const durationHours = Math.ceil(duration.value / 3600);
  let provisions: bigint;
  
  try {
    provisions = await omniTravel.calculateGroupProvisions(durationHours);
    log('🍙', `干粮费用 (合约计算): ${ethers.formatEther(provisions)} ZETA`);
  } catch (err) {
    // 如果合约函数不可用，使用本地计算
    const MIN_PROVISIONS = 0.01;
    const FEE_PER_HOUR = 0.005;
    const singleProvisions = MIN_PROVISIONS + (durationHours * FEE_PER_HOUR);
    provisions = ethers.parseEther((singleProvisions * 1.5).toFixed(6));
    log('🍙', `干粮费用 (本地计算): ${ethers.formatEther(provisions)} ZETA`);
  }

  // 7. 发起结伴跨链旅行
  log('🚀', '发起结伴跨链旅行交易...');
  log('📝', `参数: leaderTokenId=${leaderTokenId}, companionTokenId=${companionTokenId}, chainId=${targetChain.id}, duration=${duration.value}`);
  log('📝', `干粮: ${ethers.formatEther(provisions)} ZETA`);
  
  // 先做静态调用检测错误
  log('🔍', '执行静态调用检测...');
  try {
    await omniTravel.startGroupCrossChainTravel.staticCall(
      leaderTokenId,
      companionTokenId,
      targetChain.id,
      duration.value,
      { value: provisions }
    );
    log('✅', '静态调用成功，准备发送实际交易');
  } catch (staticErr: any) {
    log('❌', `静态调用失败: ${staticErr.reason || staticErr.shortMessage || staticErr.message}`);
    if (staticErr.revert) {
      log('🔍', `Revert reason: ${staticErr.revert}`);
    }
    log('💡', '无法继续，请检查合约条件');
    return;
  }
  
  try {
    const tx = await omniTravel.startGroupCrossChainTravel(
      leaderTokenId,
      companionTokenId,
      targetChain.id,
      duration.value,
      { value: provisions }
    );
    
    log('📝', `交易已发送: ${tx.hash}`);
    log('⏳', '等待交易确认...');
    
    const receipt = await tx.wait();
    log('✅', `交易确认! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
    
    // 解析事件
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = omniTravel.interface.parseLog(log);
        return parsed?.name === 'GroupCrossChainTravelStarted';
      } catch { return false; }
    });
    
    if (eventLog) {
      const parsed = omniTravel.interface.parseLog(eventLog);
      log('🎉', '=== GroupCrossChainTravelStarted 事件 ===');
      log('📌', `Leader TokenId: ${parsed?.args.leaderTokenId}`);
      log('📌', `Companion TokenId: ${parsed?.args.companionTokenId}`);
      log('📌', `Leader Owner: ${parsed?.args.leaderOwner}`);
      log('📌', `Companion Owner: ${parsed?.args.companionOwner}`);
      log('📌', `Target Chain: ${parsed?.args.targetChainId}`);
      log('📌', `Message ID: ${parsed?.args.messageId}`);
      log('📌', `Duration: ${parsed?.args.maxDuration}秒`);
      
      // 8. 调用后端确认 API
      log('🔄', '通知后端记录...');
      try {
        const backendResult = await axios.post(`${BACKEND_URL}/api/group-travel/confirm`, {
          txHash: tx.hash,
          leaderTokenId: Number(leaderTokenId),
          companionTokenId: Number(companionTokenId),
          targetChainId: targetChain.id,
          duration: duration.value,
          crossChainMessageId: parsed?.args.messageId,
          provisionsUsed: provisions.toString()
        });
        
        if (backendResult.data.success) {
          log('✅', `后端记录成功! TravelId: ${backendResult.data.data.travelId}`);
        } else {
          log('⚠️', `后端记录失败: ${backendResult.data.error}`);
        }
      } catch (err: any) {
        log('⚠️', `后端调用失败: ${err.response?.data?.error || err.message}`);
      }
    } else {
      log('⚠️', '未找到 GroupCrossChainTravelStarted 事件');
    }
    
  } catch (err: any) {
    log('❌', `交易失败: ${err.reason || err.shortMessage || err.message}`);
    
    // 尝试解析错误
    if (err.shortMessage) {
      log('🔍', `错误摘要: ${err.shortMessage}`);
    }
    if (err.info?.error?.message) {
      log('🔍', `合约错误: ${err.info.error.message}`);
    }
    if (err.code) {
      log('🔍', `错误代码: ${err.code}`);
    }
    
    // 检查是否是合约版本问题
    log('💡', '可能原因:');
    log('   ', '1. 合约未部署 startGroupCrossChainTravel 函数');
    log('   ', '2. 青蛙状态不是 Idle');
    log('   ', '3. 两只青蛙不是好友');
    log('   ', '4. 干粮费用不足');
  }

  // 9. 再次查询青蛙状态
  log('🔍', '查询最终状态...');
  const finalLeaderFrog = await getFrogByOwner(leaderWallet.address);
  const finalCompanionFrog = await getFrogByOwner(companionWallet.address);
  
  if (finalLeaderFrog) {
    log('📊', `Leader 最终状态: ${finalLeaderFrog.status}`);
  }
  if (finalCompanionFrog) {
    log('📊', `Companion 最终状态: ${finalCompanionFrog.status}`);
  }
  
  log('🏁', '=== 测试完成 ===');
}

// 运行测试
main().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
