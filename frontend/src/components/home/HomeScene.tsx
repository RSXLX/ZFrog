/**
 * 家场景主组件 - 青蛙的小窝
 * 
 * 包含：天气、邮箱、青蛙、道具栏、纪念品展示
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FrogSvg } from '../frog/FrogSvg';
import { WeatherIndicator } from './WeatherIndicator';
import { Mailbox } from './Mailbox';
import { ItemBar } from './ItemBar';
import { SouvenirShelf } from './SouvenirShelf';
import { FrogState } from '../../types/frogAnimation';
import { useNavigate } from 'react-router-dom';

interface HomeSceneProps {
  /** 青蛙 ID */
  frogId?: number;
  /** 青蛙名称 */
  frogName?: string;
  /** 当前状态 */
  frogState?: FrogState;
  /** 未读日记数量 */
  unreadDiaries?: number;
  /** 纪念品列表 */
  souvenirs?: any[];
  /** 开始旅行回调 */
  onStartTravel?: () => void;
  /** 喂食回调 */
  onFeed?: (itemId: string) => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 280, height: 320, frogSize: 100 },
  md: { width: 400, height: 450, frogSize: 150 },
  lg: { width: 520, height: 580, frogSize: 200 },
};

export function HomeScene({
  frogName = 'ZetaFrog',
  frogState = FrogState.IDLE,
  unreadDiaries = 0,
  souvenirs = [],
  onStartTravel,
  onFeed,
  size = 'md',
}: HomeSceneProps) {
  const navigate = useNavigate();
  const config = SIZE_CONFIG[size];
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showTravelPrompt, setShowTravelPrompt] = useState(false);
  const [localFrogState, setLocalFrogState] = useState(frogState);

  // 点击青蛙
  const handleFrogClick = useCallback(() => {
    // 根据选中的道具执行不同操作
    if (selectedItem) {
      if (['clover', 'sandwich', 'cake'].includes(selectedItem)) {
        // 喂食
        setLocalFrogState(FrogState.EATING);
        onFeed?.(selectedItem);
        setTimeout(() => {
          setLocalFrogState(FrogState.HAPPY);
          setTimeout(() => setLocalFrogState(FrogState.IDLE), 2000);
        }, 2000);
      } else if (selectedItem === 'backpack') {
        // 准备旅行
        setShowTravelPrompt(true);
      }
      setSelectedItem(null);
    } else {
      // 普通点击
      setLocalFrogState(FrogState.HAPPY);
      setTimeout(() => setLocalFrogState(FrogState.IDLE), 1500);
    }
  }, [selectedItem, onFeed]);

  // 打开邮箱
  const handleMailboxClick = useCallback(() => {
    navigate(`/travel-history`);
  }, [navigate]);

  // 查看纪念品
  const handleViewSouvenirs = useCallback(() => {
    navigate('/souvenirs');
  }, [navigate]);

  // 选择道具
  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(prev => prev === item.id ? null : item.id);
  }, []);

  // 确认旅行
  const handleConfirmTravel = useCallback(() => {
    setShowTravelPrompt(false);
    setLocalFrogState(FrogState.TRAVELING);
    onStartTravel?.();
  }, [onStartTravel]);

  return (
    <motion.div
      className="relative bg-gradient-to-b from-sky-200 via-emerald-100 to-amber-100
                 dark:from-gray-800 dark:via-gray-700 dark:to-gray-900
                 rounded-3xl shadow-2xl overflow-hidden"
      style={{ width: config.width, height: config.height }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* 天空背景装饰 */}
      <div className="absolute top-0 left-0 right-0 h-1/3">
        {/* 云朵 */}
        <motion.div
          className="absolute top-4 left-4 text-4xl opacity-60"
          animate={{ x: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute top-8 right-8 text-2xl opacity-40"
          animate={{ x: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        >
          ☁️
        </motion.div>
      </div>

      {/* 顶部栏 */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        {/* 天气 */}
        <WeatherIndicator size="sm" />
        
        {/* 青蛙名称 */}
        <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full shadow text-sm font-medium">
          🐸 {frogName}
        </div>
        
        {/* 邮箱 */}
        <Mailbox 
          unreadCount={unreadDiaries} 
          onClick={handleMailboxClick}
          size="sm"
        />
      </div>

      {/* 装饰植物 */}
      <div className="absolute left-4 bottom-1/3 text-3xl">
        <motion.span
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🪴
        </motion.span>
      </div>

      {/* 青蛙主体 - 居中 */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
        <motion.div whileHover={{ scale: 1.05 }}>
          <FrogSvg
            state={localFrogState}
            size={config.frogSize}
            onClick={handleFrogClick}
            showBackpack={selectedItem === 'backpack' || localFrogState === FrogState.TRAVELING}
            className="cursor-pointer"
          />
        </motion.div>
        
        {/* 选中道具提示 */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 
                         bg-emerald-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap"
            >
              点击青蛙使用道具
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 道具栏 - 底部中间 */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <ItemBar 
          selectedId={selectedItem || undefined}
          onSelect={handleSelectItem}
          direction="horizontal"
        />
      </div>

      {/* 纪念品展示架 - 最底部 */}
      <div className="absolute bottom-0 left-0 right-0">
        <SouvenirShelf 
          souvenirs={souvenirs}
          maxDisplay={5}
          onViewAll={handleViewSouvenirs}
          onSouvenirClick={(s) => console.log('Clicked souvenir:', s)}
        />
      </div>

      {/* 地面 */}
      <div className="absolute bottom-12 left-0 right-0 h-8 
                      bg-gradient-to-t from-amber-300 to-amber-200
                      dark:from-amber-800 dark:to-amber-700" />

      {/* 旅行确认弹窗 */}
      <AnimatePresence>
        {showTravelPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-xs mx-4"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">🎒✈️</div>
                <h3 className="text-lg font-bold mb-2">准备出发旅行？</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  青蛙将前往探索链上世界，发现有趣的故事！
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowTravelPrompt(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmTravel}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium"
                  >
                    出发！🚀
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default HomeScene;
