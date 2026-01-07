import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GardenState, GardenFrogState } from '../../types/garden';
import { GardenFrog } from './GardenFrog';
import { SceneObject } from './SceneObject';

interface GardenSceneProps {
  gardenState: GardenState;
  onFrogClick: (frogState: GardenFrogState) => void;
  onMailboxClick: () => void;
  onParcelClick: () => void;
  hasNewMail: boolean;
  hasNewGift: boolean;
}

// 场景类型
type SceneType = 'yard' | 'indoor';
type TimeType = 'day' | 'night';

// 三叶草位置数据（模拟原版游戏）
const CLOVER_POSITIONS = [
  { x: 15, y: 65, collected: false },
  { x: 35, y: 70, collected: false },
  { x: 55, y: 68, collected: false },
  { x: 75, y: 72, collected: false },
  { x: 25, y: 75, collected: true },
];

// 三叶草组件
const Clover: React.FC<{ x: number; y: number; onClick?: () => void }> = ({ x, y, onClick }) => (
  <motion.div
    className="absolute cursor-pointer"
    style={{ left: `${x}%`, top: `${y}%` }}
    whileHover={{ scale: 1.2 }}
    whileTap={{ scale: 0.9 }}
    animate={{ y: [0, -3, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    onClick={onClick}
  >
    <img 
      src="/garden/clover.png" 
      alt="三叶草"
      className="w-8 h-8 drop-shadow-md"
      style={{ imageRendering: 'pixelated' }}
    />
  </motion.div>
);

export const GardenScene: React.FC<GardenSceneProps> = ({
  gardenState,
  onFrogClick,
  onMailboxClick,
  onParcelClick,
  hasNewMail,
  hasNewGift
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 800, height: 600 });
  const [sceneType, setSceneType] = useState<SceneType>('yard');
  const [timeType, setTimeType] = useState<TimeType>('day');
  const [clovers, setClovers] = useState(CLOVER_POSITIONS);
  const [collectedCount, setCollectedCount] = useState(0);
  
  // 视差效果状态
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 根据实际时间自动切换日夜
  useEffect(() => {
    const hour = new Date().getHours();
    setTimeType(hour >= 18 || hour < 6 ? 'night' : 'day');
  }, []);

  // 响应式场景尺寸
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setSceneSize({ width, height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 处理鼠标移动实现视差
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePosition({ x, y });
  };

  // 获取背景图 URL
  const getBackgroundImage = () => {
    if (sceneType === 'indoor') {
      return '/garden/home_indoor.png';
    }
    return timeType === 'night' ? '/garden/yard_night.png' : '/garden/yard_day.png';
  };

  // 收集三叶草
  const collectClover = (index: number) => {
    if (clovers[index].collected) return;
    
    setClovers(prev => prev.map((c, i) => 
      i === index ? { ...c, collected: true } : c
    ));
    setCollectedCount(prev => prev + 1);
    console.log('🍀 收集了一株三叶草！');
  };

  // 生成随机初始位置
  const getInitialPosition = (index: number, isHost: boolean) => {
    if (sceneType === 'indoor') {
      return isHost ? { x: 50, y: 60 } : { x: 35 + index * 15, y: 55 };
    }
    // 庭院场景
    if (isHost) {
      return { x: 50, y: 58 };
    }
    const positions = [
      { x: 30, y: 62 },
      { x: 70, y: 60 },
      { x: 45, y: 65 },
    ];
    return positions[index % positions.length];
  };

  // 构建青蛙状态列表
  const frogStates: GardenFrogState[] = [
    ...(gardenState.ownerFrog ? [{
      frogId: gardenState.ownerFrog.id,
      frog: gardenState.ownerFrog,
      position: getInitialPosition(0, true),
      activity: 'idle' as const,
      isHost: true
    }] : []),
    ...gardenState.currentVisitors
      .filter(v => v.guestFrog)
      .map((visit, index) => ({
        frogId: visit.guestFrogId,
        frog: visit.guestFrog!,
        position: getInitialPosition(index, false),
        activity: 'exploring' as const,
        isHost: false,
        visitStartedAt: visit.startedAt
      }))
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* 背景图 - 视差效果 */}
      <motion.div
        key={`${sceneType}-${timeType}`}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          x: mousePosition.x * -20, // 反向移动
          y: mousePosition.y * -10
        }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${getBackgroundImage()})`,
          imageRendering: 'auto',
          scale: 1.1 // 放大避免露白
        }}
      />

      {/* 庭院场景额外元素 */}
      {sceneType === 'yard' && (
        <>
          {/* 三叶草 */}
          {clovers.map((clover, index) => (
            !clover.collected && (
              <Clover 
                key={index}
                x={clover.x}
                y={clover.y}
                onClick={() => collectClover(index)}
              />
            )
          ))}
          
          {/* 邮箱 (留言板入口) */}
          <SceneObject
            id="mailbox"
            imageSrc="/garden/mailbox.svg"
            label="邮箱"
            position={{ x: 10, y: 55 }}
            scale={0.8}
            hasNotification={hasNewMail}
            onClick={onMailboxClick}
          />

          {/* 包裹 (礼物入口) */}
          {hasNewGift && (
            <SceneObject
              id="parcel"
              imageSrc="/garden/parcel.png"
              label="新包裹"
              position={{ x: 25, y: 80 }}
              scale={0.7}
              hasNotification={true}
              onClick={onParcelClick}
            />
          )}
        </>
      )}

      {/* 场景中的青蛙 */}
      {frogStates.map((frogState) => (
        <GardenFrog
          key={frogState.frogId}
          frogState={frogState}
          sceneSize={sceneSize}
          onClick={() => onFrogClick(frogState)}
        />
      ))}

      {/* 顶部 UI 栏 (简化版) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* 三叶草计数 */}
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto">
          <img src="/garden/clover.png" alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
          <span className="font-bold text-green-700">{collectedCount}</span>
        </div>

        {/* 场景切换按钮 - 移到右上角，改为小图标以减少干扰 */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setSceneType('yard')}
            className={`p-2 rounded-full shadow-lg transition-all ${
              sceneType === 'yard' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
            }`}
          >
            🌳
          </button>
          <button
            onClick={() => setSceneType('indoor')}
            className={`p-2 rounded-full shadow-lg transition-all ${
              sceneType === 'indoor' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600'
            }`}
          >
            🏠
          </button>
        </div>
      </div>
      
      {/* 访客提示 */}
      {frogStates.length > 1 && (
        <div className="absolute bottom-24 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          <span className="text-sm">👥 {frogStates.length - 1} 位访客</span>
        </div>
      )}
    </div>
  );
};
