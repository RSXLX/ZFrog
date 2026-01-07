import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FrogCard } from '../components/frog/FrogCard';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { useTotalSupply } from '../hooks/useZetaFrog';
import { useMyFrog } from '../hooks/useMyFrog';

export function MyFrog() {
  const { frog, hasFrog, loading, isConnected, address } = useMyFrog();
  const { totalSupply } = useTotalSupply();
  const navigate = useNavigate();
  
  // 如果有青蛙，直接跳转到青蛙详情页
  useEffect(() => {
    console.log('[MyFrog] Check:', { loading, hasFrog, frogTokenId: frog?.tokenId, address });
    
    if (!loading && hasFrog && frog) {
      // 只有当青蛙的所有者实际上是当前连接的地址时才跳转
      // 这是一个安全检查，防止因为缓存或并发导致的错误跳转
      if (address && frog.ownerAddress.toLowerCase() !== address.toLowerCase()) {
         console.warn(`[MyFrog] Owner mismatch! Frog ${frog.tokenId} is owned by ${frog.ownerAddress}, but current wallet is ${address}`);
         return;
      }
      
      console.log('[MyFrog] Navigating to:', `/frog/${frog.tokenId}`);
      navigate(`/frog/${frog.tokenId}`);
    }
  }, [loading, hasFrog, frog, navigate, address]);
  
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-6xl mb-4">🐸</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            我的青蛙
          </h1>
          <p className="text-gray-600 mb-6">
            请先连接钱包查看你的青蛙
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loading />
        <p className="text-gray-500 mt-4">正在加载你的青蛙...</p>
      </div>
    );
  }
  
  // 没有青蛙，显示铸造引导
  if (!hasFrog) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800">
            我的青蛙 🐸
          </h1>
          <p className="text-gray-500 mt-1">
            全网已铸造 {totalSupply} 只青蛙
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white rounded-2xl shadow"
        >
          <div className="text-6xl mb-4">🥚</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            还没有青蛙
          </h2>
          <p className="text-gray-500 mb-2">
            每个钱包只能拥有一只 ZetaFrog
          </p>
          <p className="text-gray-500 mb-4">
            快来铸造属于你的青蛙吧！
          </p>
          <Link to="/?mint=true">
            <Button>🎉 立即铸造</Button>
          </Link>
        </motion.div>
      </div>
    );
  }
  
  // 有青蛙，显示青蛙卡片（通常不会执行到这里，因为会自动跳转）
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800">
          我的青蛙 🐸
        </h1>
        <p className="text-gray-500 mt-1">
          每个钱包只能拥有一只青蛙
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto"
      >
        {frog && <FrogCard frog={frog} />}
      </motion.div>
    </div>
  );
}
