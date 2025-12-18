import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { decodeEventLog } from 'viem';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';
import { apiService } from '../../services/api';

interface FrogMintProps {
  onSuccess?: () => void;
}

export function FrogMint({ onSuccess }: FrogMintProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const { isConnected } = useAccount();
  
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });
  
  const handleMint = async () => {
    setError('');
    
    // 验证名字
    if (name.length < 2 || name.length > 16) {
      setError('名字需要 2-16 个字符');
      return;
    }
    
    try {
      writeContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'mintFrog',
        args: [name],
      });
    } catch (e) {
      setError('铸造失败，请重试');
    }
  };
  
  // 成功后同步并回调
  useEffect(() => {
    if (isSuccess && receipt && onSuccess) {
      const syncAndNotify = async () => {
        try {
          // Find FrogMinted log
          const mintLog = receipt.logs.find(log => {
             try {
               const decoded = decodeEventLog({
                 abi: ZETAFROG_ABI,
                 data: log.data,
                 topics: log.topics,
               });
               return decoded.eventName === 'FrogMinted';
             } catch {
               return false;
             }
          });

          if (mintLog) {
            const decoded = decodeEventLog({
              abi: ZETAFROG_ABI,
              data: mintLog.data,
              topics: mintLog.topics,
            });
            
            if (decoded.eventName === 'FrogMinted') {
              const args = decoded.args as any;
              const tokenId = Number(args.tokenId);
              console.log('Syncing frog:', tokenId);
              // Trigger backend sync
              await apiService.syncFrog(tokenId);
            }
          }
        } catch (e) {
          console.error('Error syncing:', e);
        }
        
        // Call onSuccess after a short delay
        setTimeout(onSuccess, 1500);
      };

      syncAndNotify();
    }
  }, [isSuccess, receipt, onSuccess]);
  
  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">请先连接钱包</p>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
        🐸 铸造你的 ZetaFrog
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          给你的青蛙起个名字
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入名字 (2-16 个字符)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          maxLength={16}
          disabled={isPending || isConfirming}
        />
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/16 字符
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {writeError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {writeError.message}
        </div>
      )}
      
      {isSuccess && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-center"
        >
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold">恭喜！</p>
          <p className="text-sm">你的 ZetaFrog "{name}" 已经铸造成功！</p>
        </motion.div>
      )}
      
      <Button
        onClick={handleMint}
        disabled={isPending || isConfirming || name.length < 2}
        loading={isPending || isConfirming}
        className="w-full"
      >
        {isPending ? '确认交易中...' : 
         isConfirming ? '铸造中...' : 
         '铸造 ZetaFrog'}
      </Button>
      
      <p className="text-xs text-gray-500 text-center mt-4">
        铸造免费！只需支付 Gas 费用。
      </p>
    </motion.div>
  );
}
