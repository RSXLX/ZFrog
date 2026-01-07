/**
 * Cross-Chain Travel Form Component
 * 
 * Allows users to send frogs on cross-chain travel adventures
 * Features:
 * - Authorization check and approval flow
 * - Pre-transaction chain state verification
 * - Eligibility check via backend API
 */

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient } from 'wagmi';
import { motion } from 'framer-motion';
import { OMNI_TRAVEL_ADDRESS, OMNI_TRAVEL_ABI, ZETAFROG_ABI } from '../../config/contracts';
import { getSupportedChains, canStartCrossChainTravel, createCrossChainTravel, notifyCrossChainTravelStarted, syncCrossChainState } from '../../services/cross-chain.api';
import { Button } from '../common/Button';
import { useChainId } from 'wagmi';
import { usePendingTravel } from '../../hooks/usePendingTravel';
import { TravelPending } from './TravelPending';

// ZetaFrogNFT address (should match backend config)
const ZETAFROG_NFT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS_ZETAFROG as `0x${string}` || '0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f' as `0x${string}`;

// Testnet chain IDs (allow 1-minute test travel)
const TESTNET_CHAIN_IDS = [7001, 97, 11155111, 80002, 31337];

interface CrossChainTravelFormProps {
  frogId: number;
  tokenId: number;
  frogName: string;
  onSuccess?: () => void;
}

const ALL_DURATION_OPTIONS = [
  { label: '1 分钟 (测试)', value: 60, description: '快速验证', gasEstimate: '~0.002 ZETA', testOnly: true },
  { label: '1 小时', value: 3600, description: '快速探索', gasEstimate: '~0.03 ZETA', testOnly: false },
  { label: '6 小时', value: 21600, description: '深度冒险', gasEstimate: '~0.05 ZETA', testOnly: false },
  { label: '24 小时', value: 86400, description: '完整探险', gasEstimate: '~0.15 ZETA', testOnly: false },
];

export function CrossChainTravelForm({ frogId, tokenId, frogName, onSuccess }: CrossChainTravelFormProps) {
  const { address } = useAccount();
  const [supportedChains, setSupportedChains] = useState<any[]>([]);
  const [targetChainId, setTargetChainId] = useState<number>(97); // Default to BSC Testnet
  const [duration, setDuration] = useState(3600);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [error, setError] = useState('');
  const [travelId, setTravelId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { pendingTravel, setPendingTravel, clearPendingTravel } = usePendingTravel(frogId);
  
  // Get current chain ID to filter duration options
  const chainId = useChainId();
  const isTestnet = TESTNET_CHAIN_IDS.includes(chainId);
  
  // P2 Fix: Filter duration options based on network
  const DURATION_OPTIONS = isTestnet 
    ? ALL_DURATION_OPTIONS 
    : ALL_DURATION_OPTIONS.filter(opt => !opt.testOnly);

  const {
    data: hash,
    writeContractAsync, // Use Async version to catch errors
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, status: txStatus, error: txError } = useWaitForTransactionReceipt({
    hash,
  });

  // Public client for direct chain reads
  const publicClient = usePublicClient();

  // Check if OmniTravel is approved to manage NFTs
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: ZETAFROG_NFT_ADDRESS,
    abi: [{
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'operator', type: 'address' }
      ],
      name: 'isApprovedForAll',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function'
    }],
    functionName: 'isApprovedForAll',
    args: address ? [address, OMNI_TRAVEL_ADDRESS] : undefined,
    query: { enabled: !!address }
  });

  // Approval transaction state
  const {
    data: approvalHash,
    // @ts-ignore - wagmi writeContractAsync type
    writeContractAsync: writeApproval,
    isPending: isApprovePending,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Refetch approval status after successful approval
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchApproval();
    }
  }, [isApprovalSuccess, refetchApproval]);

  // Load supported chains
  useEffect(() => {
    getSupportedChains().then(chains => {
      setSupportedChains(chains);
      if (chains.length > 0 && !targetChainId) {
        // Pick a random chain instead of always the first one
        const randomIndex = Math.floor(Math.random() * chains.length);
        setTargetChainId(chains[randomIndex].chainId);
      }
    }).catch(err => {
      console.error('Failed to load chains:', err);
    });
  }, []);



  // Check eligibility when chain or tokenId changes
  useEffect(() => {
    if (!tokenId || !targetChainId) return;

    setIsCheckingEligibility(true);
    canStartCrossChainTravel(tokenId, targetChainId)
      .then(result => {
        setIsEligible(result.canStart);
        setEligibilityReason(result.reason || '');
      })
      .catch(err => {
        setIsEligible(false);
        setEligibilityReason('检查资格失败');
        console.error('Eligibility check failed:', err);
      })
      .finally(() => {
        setIsCheckingEligibility(false);
      });
  }, [tokenId, targetChainId]);

  const handleStartCrossChainTravel = async () => {
    setError('');

    if (!OMNI_TRAVEL_ADDRESS) {
      setError('跨链合约地址未配置');
      return;
    }

    if (!address) {
      setError('请先连接钱包');
      return;
    }

    if (!isEligible) {
      setError(eligibilityReason || '青蛙当前无法进行跨链旅行');
      return;
    }

    // Check authorization first
    if (!isApproved) {
      setError('请先授权跨链合约管理您的青蛙');
      return;
    }

    try {
      // Initiate blockchain transaction
      // Calculate provisions based on duration
      console.log("Initiating transaction...");
      // Test mode (1 minute): 0.002 ZETA
      // Normal mode: 0.01 ZETA base + 0.005 ZETA/hour
      let provisions = BigInt(10000000000000000); // Default 0.01 ZETA
      
      if (duration === 60) {
        provisions = BigInt(2000000000000000); // 0.002 ZETA for test
      } else {
        const hours = Math.ceil(duration / 3600);
        const base = BigInt(10000000000000000); // 0.01 ZETA
        const hourly = BigInt(5000000000000000); // 0.005 ZETA
        provisions = base + (BigInt(hours) * hourly);
      }
      
      // Log arguments for debugging
      console.log('Starting Cross-Chain Travel with params:', {
        address: OMNI_TRAVEL_ADDRESS,
        args: [BigInt(tokenId), BigInt(targetChainId), BigInt(duration)],
        value: provisions,
        provisionsStr: provisions.toString()
      });

      // @ts-ignore - OMNI_TRAVEL_ABI type compatibility
      const txHash = await writeContractAsync({
        address: OMNI_TRAVEL_ADDRESS,
        abi: OMNI_TRAVEL_ABI,
        functionName: 'startCrossChainTravel',
        args: [BigInt(tokenId), BigInt(targetChainId), BigInt(duration)],
        value: provisions,
        gas: BigInt(2000000), // Force high gas limit to bypass estimation errors during development
      });

      // Set pending state immediately
      setPendingTravel({
        txHash,
        frogId,
        tokenId,
        targetChainId,
        duration,
      });

    } catch (err: any) {
      console.error('❌ Failed to start cross-chain travel details:', {
        message: err.message,
        details: err.details,
        shortMessage: err.shortMessage,
        cause: err.cause,
        fullError: err
      });
      const reason = err.shortMessage || err.details || err.message || 'Unknown error';
      setError(`交互失败: ${reason}`);
    }
  };

  // Handle approval for OmniTravel contract
  const handleApprove = async () => {
    if (!ZETAFROG_NFT_ADDRESS) return;
    
    try {
      // @ts-ignore - wagmi type compatibility for ABI
      await writeApproval({
        address: ZETAFROG_NFT_ADDRESS,
        abi: [{
          inputs: [
            { name: 'operator', type: 'address' },
            { name: 'approved', type: 'bool' }
          ],
          name: 'setApprovalForAll',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }],
        functionName: 'setApprovalForAll',
        args: [OMNI_TRAVEL_ADDRESS, true],
      });
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError(`授权失败: ${err.shortMessage || err.message}`);
    }
  };

  // P1 Fix: Manual sync chain status
  const handleSyncStatus = async () => {
    try {
      setIsSyncing(true);
      setError('');
      await syncCrossChainState(tokenId);
      
      // Re-check eligibility after sync
      const result = await canStartCrossChainTravel(tokenId, targetChainId);
      setIsEligible(result.canStart);
      setEligibilityReason(result.reason || '');
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(`同步失败: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash && !travelId) { // Only create if not already created
      const createAndNotify = async () => {
         try {
             // Create travel record ONLY after successful transaction submission
             const { travelId: newTravelId } = await createCrossChainTravel({
                frogId,
                tokenId,
                targetChainId,
                duration,
                ownerAddress: address || '',
             });
             setTravelId(newTravelId);
             
             // Notify backend
             const messageId = hash; 
             await notifyCrossChainTravelStarted(newTravelId, messageId, hash);
             
             // P0 Fix: Dispatch event for immediate UI update in FrogDetail
             window.dispatchEvent(new CustomEvent('travel:started', {
                detail: {
                    frogId,
                    targetWallet: '0x0000000000000000000000000000000000000000',
                    duration,
                    chainId: targetChainId,
                    isRandom: false
                }
             }));

             // Clear pending state to exit TravelPending UI
             clearPendingTravel();

             if (onSuccess) onSuccess();
         } catch(e) {
             console.error("Failed to create travel record post-transaction:", e);
             // Also clear pending on API error to avoid stuck UI
             clearPendingTravel();
         }
      };
      createAndNotify();
    }
  }, [isSuccess, hash, travelId, createCrossChainTravel, notifyCrossChainTravelStarted, frogId, tokenId, targetChainId, duration, address, onSuccess, clearPendingTravel]);

  // Handle failed transaction (Revert)
  useEffect(() => {
    if (txStatus === 'error' || txError) {
      console.error('Transaction failed/reverted:', txError);
      clearPendingTravel(); // Stop the pending UI
      setError('交易执行失败 (Reverted)。这可能是由于干粮不足或合约限制。');
    }
  }, [txStatus, txError, clearPendingTravel]);


  const selectedChain = supportedChains.find(c => c.chainId === targetChainId);

  if (!OMNI_TRAVEL_ADDRESS) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800">⚠️ 跨链合约未部署，功能暂不可用</p>
      </div>
    );
  }

  // Show pending animation if transaction is pending
  if (pendingTravel) {
    return (
      <TravelPending 
        txHash={pendingTravel.txHash} 
        onReset={clearPendingTravel}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-xl p-6 space-y-6 border-2 border-purple-200"
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🌉 跨链旅行
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          让 {frogName} 真正跨链到其他区块链冒险！
        </p>
        <p className="text-xs text-purple-600 mt-1">
          系统将自动随机选择目标链
        </p>
      </div>

      {/* Duration Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          选择旅行时长 ⏱️
        </label>
        <div className="space-y-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setDuration(option.value)}
              className={`w-full p-3 rounded-xl border-2 transition-all flex justify-between items-center ${
                duration === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="text-left">
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-gray-500 ml-2">{option.description}</span>
              </div>
              <span className="text-xs text-gray-400">{option.gasEstimate}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Eligibility Check */}
      {isCheckingEligibility && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          🔍 检查资格中...
        </div>
      )}

      {!isCheckingEligibility && !isEligible && eligibilityReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 space-y-2">
          <div className="flex items-center justify-between">
            <span>⚠️ {eligibilityReason}</span>
            <button
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              {isSyncing ? '同步中...' : '🔄 刷新状态'}
            </button>
          </div>
          <p className="text-xs text-yellow-600">
            如果你确定青蛙应该可以旅行，请点击刷新同步链上状态
          </p>
        </div>
      )}

      {!isCheckingEligibility && isEligible &&  (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          ✅ 青蛙可以开始跨链旅行！
        </div>
      )}

      {/* Authorization Status */}
      {!isApproved && !isApprovalConfirming && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-orange-700">
            <span className="text-xl">🔒</span>
            <span className="font-medium">需要授权</span>
          </div>
          <p className="text-sm text-orange-600">
            请先授权跨链旅行合约管理您的青蛙。这是一次性操作，之后可以直接发起旅行。
          </p>
          <Button
            onClick={handleApprove}
            disabled={isApprovePending}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
          >
            {isApprovePending ? '确认授权中...' : '🔓 授权跨链合约'}
          </Button>
        </div>
      )}

      {isApprovalConfirming && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          ⏳ 授权交易确认中...
        </div>
      )}

      {isApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-600 flex items-center gap-1">
          ✅ 已授权跨链合约
        </div>
      )}

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-purple-900 text-sm">跨链旅行说明：</h4>
        <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
          <li>青蛙将被锁定在 ZetaChain 上</li>
          <li>跨链到 {selectedChain?.name || '目标链'} 进行真实探索</li>
          <li>探索完成后自动返回 ZetaChain</li>
          <li>预估费用: 0.03-0.05 ZETA (跨链 Gas)</li>
        </ul>
      </div>

      {/* Manual Sync Button (Always Visible if not eligible) */}
      {!isEligible && (
        <div className="flex justify-end">
          <button
            onClick={handleSyncStatus}
            disabled={isSyncing}
            className="text-xs text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
          >
            {isSyncing ? '正在同步链上状态...' : '数据不一致？点击强制同步状态'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {(error || writeError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error || writeError?.message}
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleStartCrossChainTravel}
        disabled={isPending || isConfirming || !isEligible || isCheckingEligibility || !isApproved}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        size="lg"
      >
        {isPending
          ? '确认交易中...'
          : isConfirming
          ? '等待确认...'
          : !isApproved
          ? '🔒 请先授权'
          : '🚀 开始跨链旅行'}
      </Button>

      {/* Manual Sync Button (Keep as Fail-safe only) */}
    </motion.div>
  );
}
