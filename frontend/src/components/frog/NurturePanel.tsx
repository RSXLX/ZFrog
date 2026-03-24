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
import { frogFeatureApi } from '../../features/frog/api';

interface NurturePanelProps {
  frogId: number;
  frogTokenId: number;
  ownerAddress: string;
  mode?: 'full' | 'detail';
}

interface FrogInfo {
  level: number;
  canEvolve: boolean;
  evolutionType: string | null;
  energy: number;
  isResting: boolean;
}

type TabId = 'status' | 'activities' | 'evolution' | 'tasks' | 'shop';

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

export function NurturePanel({
  frogId,
  frogTokenId,
  ownerAddress,
  mode = 'full',
}: NurturePanelProps) {
  const [frogInfo, setFrogInfo] = useState<FrogInfo | null>(null);
  const isDetailMode = mode === 'detail';
  const [activeTab, setActiveTab] = useState<TabId>(isDetailMode ? 'activities' : 'status');
  const [walletRefreshTrigger, setWalletRefreshTrigger] = useState(0);

  // 获取青蛙信息
  const fetchFrogInfo = async () => {
    try {
      const frogData = await frogFeatureApi.getRuntimeState(frogTokenId);
      if (frogData) {
        setFrogInfo({
          level: frogData.level || 1,
          canEvolve: frogData.canEvolve || false,
          evolutionType: frogData.evolutionType || null,
          energy: frogData.energy ?? 100,
          isResting: frogData.isResting ?? false,
        });
      }
    } catch (err) {
      console.error('获取青蛙信息失败:', err);
    }
  };

  useEffect(() => {
    fetchFrogInfo();
  }, [frogTokenId]);

  useEffect(() => {
    setActiveTab(isDetailMode ? 'activities' : 'status');
  }, [isDetailMode]);

  const handleNurtureUpdate = () => {
    fetchFrogInfo();
    setWalletRefreshTrigger((value) => value + 1);
  };

  const tabs = [
    ...(isDetailMode
      ? [{ id: 'activities' as const, label: '互动', icon: Heart }]
      : [{ id: 'status' as const, label: '状态', icon: Heart }]),
    { id: 'tasks' as const, label: '任务', icon: ClipboardList },
    { id: 'shop' as const, label: '商店', icon: ShoppingCart },
    { id: 'evolution' as const, label: '进化', icon: Sparkles, badge: frogInfo?.canEvolve && !frogInfo?.evolutionType },
  ];

  const renderActivityContent = (includeStatusPanel: boolean) => (
    <div className="space-y-4">
      {includeStatusPanel ? (
        <StatusPanel
          frogId={frogId}
          ownerAddress={ownerAddress}
          onStatusChange={handleNurtureUpdate}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          生命状态已收敛到上方卡片，这里保留互动和休息入口。
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <GuessGame
          frogId={frogId}
          ownerAddress={ownerAddress}
          onComplete={handleNurtureUpdate}
        />
        {(frogInfo?.level ?? 1) >= 3 ? (
          <CatchBugGame
            frogId={frogId}
            ownerAddress={ownerAddress}
            onComplete={handleNurtureUpdate}
          />
        ) : (
          <LockedGame name="接虫子" requiredLevel={3} currentLevel={frogInfo?.level ?? 1} />
        )}
        {(frogInfo?.level ?? 1) >= 5 ? (
          <LilyPadGame
            frogId={frogId}
            ownerAddress={ownerAddress}
            onComplete={handleNurtureUpdate}
          />
        ) : (
          <LockedGame name="跳荷叶" requiredLevel={5} currentLevel={frogInfo?.level ?? 1} />
        )}
        {(frogInfo?.level ?? 1) >= 8 ? (
          <MemoryGame
            frogId={frogId}
            ownerAddress={ownerAddress}
            onComplete={handleNurtureUpdate}
          />
        ) : (
          <LockedGame name="记忆翻牌" requiredLevel={8} currentLevel={frogInfo?.level ?? 1} />
        )}
      </div>

      {frogInfo ? (
        <RestPanel
          frogId={frogId}
          ownerAddress={ownerAddress}
          energy={frogInfo.energy}
          isResting={frogInfo.isResting}
          onRestChange={handleNurtureUpdate}
        />
      ) : null}
    </div>
  );

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!isDetailMode ? (
        <LilyWallet ownerAddress={ownerAddress} refreshTrigger={walletRefreshTrigger} />
      ) : null}

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
      {activeTab === 'status' ? renderActivityContent(true) : null}

      {activeTab === 'activities' ? renderActivityContent(false) : null}

      {activeTab === 'tasks' && (
        <TaskPanel ownerAddress={ownerAddress} onClaimed={handleNurtureUpdate} />
      )}

      {activeTab === 'shop' && (
        <ShopPanel 
          ownerAddress={ownerAddress} 
          onPurchase={handleNurtureUpdate}
        />
      )}

      {activeTab === 'evolution' && frogInfo && (
        <EvolutionPanel
          frogId={frogId}
          canEvolve={frogInfo.canEvolve}
          currentType={frogInfo.evolutionType}
          level={frogInfo.level}
          onEvolved={handleNurtureUpdate}
        />
      )}
    </motion.div>
  );
}

export default NurturePanel;
