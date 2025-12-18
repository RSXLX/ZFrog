import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FrogPet } from '../components/frog/FrogPet';
import { TravelForm } from '../components/travel/TravelForm';
import { TravelStatus } from '../components/travel/TravelStatus';
import { TravelJournal } from '../components/travel/TravelJournal';
import { Loading } from '../components/common/Loading';
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';
import { apiService, type Frog } from '../services/api';

interface Travel {
  id: number;
  startTime: string;
  endTime: string;
  targetWallet: string;
  status: string;
  completed: boolean;
}

export function FrogDetail() {
  const { id } = useParams<{ id: string }>();
  const tokenId = parseInt(id || '0');
  
  const [frog, setFrog] = useState<Frog | null>(null);
  const [activeTravel, setActiveTravel] = useState<Travel | null>(null);
  const [travels, setTravels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const frogData = await apiService.getFrogDetail(tokenId);
      
      // Check for status transition: Traveling -> Idle
      if (prevStatus === 'Traveling' && frogData?.status === 'Idle') {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000); // Hide after 5s
      }
      setPrevStatus(frogData?.status || null);
      
      setFrog(frogData);
      
      // 获取旅行历史
      const historyData = await apiService.getFrogsTravels(tokenId);
      setTravels(historyData.filter(t => t.status === 'Completed')); // 仅显示已完成的旅行
      
      if (frogData?.status === 'Traveling') {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/travels/${tokenId}/active`);
        if (response.ok) {
          const travelData = await response.json();
          setActiveTravel({
            ...travelData,
            startTime: travelData.startTime,
            endTime: travelData.endTime,
            completed: travelData.status === 'Completed'
          });
        }
      } else {
        setActiveTravel(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [tokenId]);
  
  useWebSocket(tokenId);
  
  useEffect(() => {
    const handleTravelCompleted = () => {
      fetchData();
    };
    
    window.addEventListener('travel:completed', handleTravelCompleted);
    
    return () => {
      window.removeEventListener('travel:completed', handleTravelCompleted);
    };
  }, [tokenId]);
  
  useEffect(() => {
    if (frog?.status === 'Traveling' && activeTravel && !activeTravel.completed) {
      const checkInterval = setInterval(() => {
        const now = Date.now();
        const endTime = new Date(activeTravel.endTime).getTime();
        
        if (now >= endTime + 5000) {
          fetchData();
        }
      }, 5000);
      
      return () => clearInterval(checkInterval);
    }
  }, [frog?.status, activeTravel, tokenId]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading size="lg" text="加载中..." />
      </div>
    );
  }
  
  if (error || !frog) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          青蛙未找到
        </h1>
        <p className="text-gray-600">
          Token ID #{tokenId} 不存在或尚未铸造
        </p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Celebration Overlay */}
      {showCelebration && (
        <motion.div
           initial={{ opacity: 0, scale: 0.5 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-2xl text-center border-4 border-yellow-400">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-yellow-600 mb-2">旅行完成！</h2>
            <p className="text-gray-600">你的青蛙带回了新的故事和纪念品</p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {frog.name}
        </h1>
        <p className="text-gray-500">
          Token ID: #{tokenId} | 旅行次数: {frog.totalTravels}
        </p>
      </motion.div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* 左侧：青蛙显示 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center"
        >
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 w-full flex items-center justify-center">
            <FrogPet
              frogId={tokenId}
              name={frog.name}
              status={frog.status}
            />
          </div>
          
          {/* 青蛙信息 */}
          <div className="mt-4 w-full bg-white rounded-xl p-4 shadow">
            <h3 className="font-semibold text-gray-700 mb-3">青蛙信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">生日</span>
                <span className="text-gray-800">{new Date(frog.birthday).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className={`font-medium ${
                  frog.status === 'Idle' ? 'text-green-600' :
                  frog.status === 'Traveling' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {frog.status === 'Idle' ? '在家' :
                   frog.status === 'Traveling' ? '旅行中' : '返程中'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">旅行次数</span>
                <span className="text-gray-800">{frog.totalTravels} 次</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* 右侧：旅行相关 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* 旅行中显示状态 */}
          {frog.status === 'Traveling' && activeTravel && !activeTravel.completed && (
            <TravelStatus
              frogName={frog.name}
              startTime={new Date(activeTravel.startTime)}
              endTime={new Date(activeTravel.endTime)}
              targetWallet={activeTravel.targetWallet}
            />
          )}
          
          {/* 空闲时显示表单 */}
          {frog.status === 'Idle' && (
            <TravelForm
              frogId={tokenId}
              frogName={frog.name}
              onSuccess={() => {
                fetchData();
              }}
            />
          )}
        </motion.div>
      </div>
      
      {/* 旅行历史 - 示例 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📚 旅行日记
        </h2>
        
        {travels.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-gray-500">
              还没有旅行记录，派青蛙去冒险吧！
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {travels.map((travel) => (
              <TravelJournal
                key={travel.id}
                frogName={frog.name}
                title={travel.journalContent?.title || '神秘冒险'}
                content={travel.journalContent?.content || '（日记内容生成中...）'}
                mood={travel.journalContent?.mood || 'happy'}
                highlights={travel.journalContent?.highlights || []}
                souvenir={travel.souvenir ? { name: travel.souvenir.name, rarity: travel.souvenir.rarity } : undefined}
                completedAt={new Date(travel.completedAt)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
