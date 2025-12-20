import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { FrogState } from '../types/frogAnimation';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { AccountCard } from '../components/wallet/AccountCard';
import { FrogMint } from '../components/frog/FrogMint';
import { FrogPet } from '../components/frog/FrogPet';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { TravelP0Form } from '../components/travel/TravelP0Form';
import { apiService } from '../services/api';
import { useFrogStore } from '../stores/frogStore';

export function Home() {
  const { isConnected, address } = useAccount();
  const [hasFrogs, setHasFrogs] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const { setCurrentFrog, currentFrog } = useFrogStore();
  const [showMint, setShowMint] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('mint') === 'true') {
      setShowMint(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isConnected && address) {
      setCheckLoading(true);
      apiService.getFrogsByOwner(address)
        .then(frogs => {
          setHasFrogs(frogs.length > 0);
          if (frogs.length > 0 && !currentFrog) {
            setCurrentFrog(frogs[0]);
          }
        })
        .catch(console.error)
        .finally(() => setCheckLoading(false));
    }
  }, [isConnected, address]);
  
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className={isConnected ? "grid lg:grid-cols-3 gap-8" : "flex flex-col items-center"}>
        {/* 主要内容 */}
        <div className={isConnected ? "lg:col-span-2" : "w-full max-w-4xl"}>
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
        <h1 className="text-5xl font-bold text-green-600 mb-4">
          🐸 ZetaFrog
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          你的跨链桌面宠物
        </p>
        <p className="text-gray-500">
          铸造一只青蛙，派它去探索区块链钱包，
          获得 AI 生成的旅行故事！
        </p>
      </motion.div>
      
      {/* Demo Frog */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="flex justify-center mb-12"
      >
        <FrogPet
          frogId={0}
          name="示例青蛙"
          initialState={FrogState.IDLE}
        />
      </motion.div>
      
      {/* Connect / Mint Section */}
      {!isConnected ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-gray-600 mb-4">
            连接钱包开始你的冒险
          </p>
          <ConnectButton />
        </motion.div>
      ) : checkLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">正在检查账户...</p>
        </div>
      ) : hasFrogs && !showMint ? (
              <>
                {/* 欢迎回来卡片 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center"
                >
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    欢迎回来，旅行者！🎒
                  </h2>
      
                  <p className="text-gray-600 mb-8">
                    查看你的青蛙收集的旅行故事和纪念品。
                  </p>
                  <div className="space-y-4">
                    <Link to="/my-frogs" className="block w-full">
                      <Button className="w-full text-lg py-4">
                        我的青蛙控制台
                      </Button>
                    </Link>
                    <Link to="/travel-history" className="block w-full">
                      <Button variant="outline" className="w-full text-lg py-4">
                        📖 旅行日记
                      </Button>
                    </Link>
                    <Link to="/badges" className="block w-full">
                      <Button variant="outline" className="w-full text-lg py-4">
                        🏆 我的徽章
                      </Button>
                    </Link>
                    <p className="text-sm text-gray-500">
                      或者 <button 
                        onClick={() => setShowMint(true)} 
                        className="text-green-600 hover:underline cursor-pointer"
                      >
                        去铸造更多青蛙
                      </button>
                    </p>
                  </div>
                </motion.div>
              </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <FrogMint
            onSuccess={() => {
              window.location.href = '/my-frogs';
            }}
          />
        </motion.div>
      )}
      
      {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-3 gap-6 mt-16"
          >
            <FeatureCard
              emoji="🎨"
              title="独特 NFT"
              description="每只 ZetaFrog 都是 ZetaChain 上独一无二的 NFT"
            />
            <FeatureCard
              emoji="🔍"
              title="钱包探索"
              description="派你的青蛙去观察任意钱包"
            />
            <FeatureCard
              emoji="📖"
              title="AI 故事"
              description="收获 AI 生成的旅行日记和纪念品"
            />
          </motion.div>
          
          {/* How it works */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              如何玩？
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <StepCard step={1} title="连接钱包" icon="🔗" />
              <StepCard step={2} title="铸造青蛙" icon="🐸" />
              <StepCard step={3} title="派它旅行" icon="✈️" />
              <StepCard step={4} title="收获故事" icon="📜" />
            </div>
          </motion.div>
        </div>
        
        {/* 侧边栏 */}
        {isConnected && (
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* 账户卡片 */}
              <AccountCard />
              
              {/* 用户中心 */}
              {hasFrogs && !showMint && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🎒</span>
                    用户中心
                  </h3>
                  <div className="space-y-3">
                    <Link
                      to="/my-frogs"
                      className="block w-full text-center py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                    >
                      🐸 我的青蛙
                    </Link>
                    <Link
                      to="/travel-history"
                      className="block w-full text-center py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                    >
                      📖 旅行日记
                    </Link>
                    <Link
                      to="/badges"
                      className="block w-full text-center py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                    >
                      🏆 我的徽章
                    </Link>
                    <button
                      onClick={() => setShowMint(true)}
                      className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors text-sm"
                    >
                      铸造更多青蛙
                    </button>
                    <button
                      onClick={() => window.open('https://athens.explorer.zetachain.com/', '_blank')}
                      className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors text-sm"
                    >
                      🔍 区块链浏览器
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white/50 backdrop-blur rounded-xl p-6 text-center shadow-lg"
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}

function StepCard({ step, title, icon }: {
  step: number;
  title: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm mb-2 mx-auto">
        {step}
      </div>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
    </div>
  );
}
