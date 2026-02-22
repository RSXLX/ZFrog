/**
 * 🐸 宠物蛋系统 - 养成主面板
 * 整合所有养成相关组件：状态、钱包、游戏、进化、任务、商店
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ClipboardList, ShoppingCart, Sparkles, Lock } from 'lucide-react';
import StatusPanel from './StatusPanel';
import LilyWallet from './LilyWallet';
import GuessGame from './GuessGame';
import CatchBugGame from './CatchBugGame';
import LilyPadGame from './LilyPadGame';
import MemoryGame from './MemoryGame';
import RestPanel from './RestPanel';
import EvolutionPanel from './EvolutionPanel';
import TaskPanel from './TaskPanel';
import ShopPanel from './ShopPanel';
import { apiService } from '../../services/api';

interface NurturePanelProps {
  frogId: number;
  ownerAddress: string;
}

interface FrogInfo {
  level: number;
  canEvolve: boolean;
  evolutionType: string | null;
  energy: number;
  isResting: boolean;
}

type TabId = 'status' | 'evolution' | 'tasks' | 'shop';

// 锁定游戏提示组件
function LockedGame({ name, requiredLevel, currentLevel }: { name: string; requiredLevel: number; currentLevel: number }) {
  return (
    <motion.div
      className="relative px-4 py-3 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 opacity-60 cursor-not-allowed"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-500">{name}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Lv.{requiredLevel} 解锁 (当前 Lv.{currentLevel})
      </p>
    </motion.div>
  );
}

export function NurturePanel({ frogId, ownerAddress }: NurturePanelProps) {
  const [frogInfo, setFrogInfo] = useState<FrogInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('status');

  // 获取青蛙信息
  const fetchFrogInfo = async () => {
    try {
      const response = await apiService.get(`/frogs/${frogId}`);
      if (response.data) {
        setFrogInfo({
          level: response.data.level || 1,
          canEvolve: response.data.canEvolve || false,
          evolutionType: response.data.evolutionType || null,
          energy: response.data.energy ?? 100,
          isResting: response.data.isResting ?? false,
        });
      }
    } catch (err) {
      console.error('获取青蛙信息失败:', err);
    }
  };

  useEffect(() => {
    fetchFrogInfo();
  }, [frogId]);

  const tabs = [
    { id: 'status' as const, label: '状态', icon: Heart },
    { id: 'tasks' as const, label: '任务', icon: ClipboardList },
    { id: 'shop' as const, label: '商店', icon: ShoppingCart },
    { id: 'evolution' as const, label: '进化', icon: Sparkles, badge: frogInfo?.canEvolve && !frogInfo?.evolutionType },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* $LILY 钱包 */}
      <LilyWallet ownerAddress={ownerAddress} />

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative flex-1 py-2.5 px-3 rounded-xl font-medium text-sm whitespace-nowrap
              transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <tab.icon size={16} className="inline-block mr-1" />
            {tab.label}
            {tab.badge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <StatusPanel
            frogId={frogId}
            ownerAddress={ownerAddress}
            onStatusChange={fetchFrogInfo}
          />
          
          {/* 游戏入口 */}
          <div className="flex flex-wrap gap-3 justify-center">
            <GuessGame
              frogId={frogId}
              ownerAddress={ownerAddress}
              onComplete={fetchFrogInfo}
            />
            {/* Lv.3 解锁接虫子游戏 */}
            {(frogInfo?.level ?? 1) >= 3 ? (
              <CatchBugGame
                frogId={frogId}
                ownerAddress={ownerAddress}
                onComplete={fetchFrogInfo}
              />
            ) : (
              <LockedGame name="接虫子" requiredLevel={3} currentLevel={frogInfo?.level ?? 1} />
            )}
            {/* Lv.5 解锁跳荷叶游戏 */}
            {(frogInfo?.level ?? 1) >= 5 ? (
              <LilyPadGame
                frogId={frogId}
                ownerAddress={ownerAddress}
                onComplete={fetchFrogInfo}
              />
            ) : (
              <LockedGame name="跳荷叶" requiredLevel={5} currentLevel={frogInfo?.level ?? 1} />
            )}
            {/* Lv.8 解锁记忆翻牌游戏 */}
            {(frogInfo?.level ?? 1) >= 8 ? (
              <MemoryGame
                frogId={frogId}
                ownerAddress={ownerAddress}
                onComplete={fetchFrogInfo}
              />
            ) : (
              <LockedGame name="记忆翻牌" requiredLevel={8} currentLevel={frogInfo?.level ?? 1} />
            )}
          </div>

          {/* 休息面板 */}
          {frogInfo && (
            <RestPanel
              frogId={frogId}
              ownerAddress={ownerAddress}
              energy={frogInfo.energy}
              isResting={frogInfo.isResting}
              onRestChange={fetchFrogInfo}
            />
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <TaskPanel ownerAddress={ownerAddress} />
      )}

      {activeTab === 'shop' && (
        <ShopPanel 
          ownerAddress={ownerAddress} 
          onPurchase={fetchFrogInfo}
        />
      )}

      {activeTab === 'evolution' && frogInfo && (
        <EvolutionPanel
          frogId={frogId}
          canEvolve={frogInfo.canEvolve}
          currentType={frogInfo.evolutionType}
          level={frogInfo.level}
          onEvolved={fetchFrogInfo}
        />
      )}
    </motion.div>
  );
}

export default NurturePanel;

