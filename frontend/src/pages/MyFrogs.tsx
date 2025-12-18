import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FrogCard } from '../components/frog/FrogCard';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { useTotalSupply } from '../hooks/useZetaFrog';
import { apiService, type Frog } from '../services/api';

export function MyFrogs() {
  const { isConnected, address } = useAccount();
  const { totalSupply } = useTotalSupply();
  const [frogs, setFrogs] = useState<Frog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 从后端 API 获取用户的青蛙
  useEffect(() => {
    if (isConnected && address) {
      setLoading(true);
      apiService.getFrogsByOwner(address)
        .then(setFrogs)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setFrogs([]);
    }
  }, [isConnected, address]);
  
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
  
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              我的青蛙 🐸
            </h1>
            <p className="text-gray-500 mt-1">
              共有 {frogs.length} 只青蛙 | 全网已铸造 {totalSupply} 只
            </p>
          </div>
          <Link to="/?mint=true">
            <Button>+ 铸造新青蛙</Button>
          </Link>
        </div>
      </motion.div>
      
      {frogs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white rounded-2xl shadow"
        >
          <div className="text-6xl mb-4">🥚</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            还没有青蛙
          </h2>
          <p className="text-gray-500 mb-4">
            快去铸造你的第一只 ZetaFrog 吧！
          </p>
          <Link to="/">
            <Button>立即铸造</Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {frogs.map((frog) => (
            <FrogCard key={frog.tokenId} frog={frog} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
