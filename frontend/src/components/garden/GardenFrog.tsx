import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GardenFrogState, GardenFrogActivity } from '../../types/garden';

interface GardenFrogProps {
  frogState: GardenFrogState;
  sceneSize: { width: number; height: number };
  onClick: () => void;
}

// 青蛙颜色配置 - 更丰富的配色
const FROG_COLORS = [
  { body: '#68D391', belly: '#9AE6B4', spots: '#48BB78', cheek: '#FEB2B2' },
  { body: '#63B3ED', belly: '#90CDF4', spots: '#4299E1', cheek: '#FED7E2' },
  { body: '#F687B3', belly: '#FBB6CE', spots: '#ED64A6', cheek: '#FEEBC8' },
  { body: '#F6E05E', belly: '#FAF089', spots: '#ECC94B', cheek: '#FED7D7' },
  { body: '#B794F4', belly: '#D6BCFA', spots: '#9F7AEA', cheek: '#FED7E2' },
  { body: '#FC8181', belly: '#FEB2B2', spots: '#F56565', cheek: '#FEEBC8' },
];

export const GardenFrog: React.FC<GardenFrogProps> = ({
  frogState,
  sceneSize,
  onClick
}) => {
  const [position, setPosition] = useState(frogState.position);
  const [activity, setActivity] = useState<GardenFrogActivity>(frogState.activity);
  const [isMoving, setIsMoving] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [eyesClosed, setEyesClosed] = useState(false);

  // 获取青蛙颜色（基于 frogId）
  const colors = FROG_COLORS[frogState.frogId % FROG_COLORS.length];

  // 眨眼效果
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyesClosed(true);
      setTimeout(() => setEyesClosed(false), 150);
    }, 3000 + Math.random() * 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // 随机移动逻辑（仅访客）
  useEffect(() => {
    if (frogState.isHost) return;

    const moveInterval = setInterval(() => {
      if (Math.random() > 0.3) return;

      const newX = Math.max(15, Math.min(85, position.x + (Math.random() - 0.5) * 15));
      const newY = Math.max(50, Math.min(75, position.y + (Math.random() - 0.5) * 10));
      
      setFacingRight(newX > position.x);
      setIsMoving(true);
      setActivity('walking');
      
      setTimeout(() => {
        setPosition({ x: newX, y: newY });
        setIsMoving(false);
        setActivity('idle');
      }, 600);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(moveInterval);
  }, [frogState.isHost, position]);

  // 计算做客时长
  const getVisitDuration = () => {
    if (!frogState.visitStartedAt) return null;
    const start = new Date(frogState.visitStartedAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    return minutes;
  };

  const visitDuration = getVisitDuration();

  return (
    <motion.div
      className="absolute cursor-pointer select-none group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: Math.round(position.y),
        touchAction: 'none', // 防止触摸滚动干扰拖拽
      }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => {
        setIsMoving(true); // 拖拽时暂停自动移动
        setActivity('idle');
      }}
      onDragEnd={() => {
        setIsMoving(false);
        // 这里可以添加更新位置到服务器的逻辑
      }}
      whileDrag={{ scale: 1.2, cursor: 'grabbing' }}
      animate={{
        y: isMoving ? [0, -20, 0, -15, 0] : (activity === 'idle' ? [0, -3, 0] : 0),
      }}
      transition={{
        y: isMoving 
          ? { duration: 0.6, times: [0, 0.25, 0.5, 0.75, 1] }
          : { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{ scale: 1.1, cursor: 'grab' }}
      onClick={onClick}
    >
      {/* 青蛙名字标签 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10 ${
          frogState.isHost ? '' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <div className={`px-3 py-1 rounded-full text-xs shadow-lg ${
          frogState.isHost 
            ? 'bg-green-500 text-white' 
            : 'bg-white/95 text-gray-700'
        }`}>
          <span className="font-bold">{frogState.frog.name}</span>
          {!frogState.isHost && visitDuration !== null && (
            <span className="text-gray-400 ml-1">· {visitDuration}分钟</span>
          )}
        </div>
        {/* 小三角 */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
          border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent
          ${frogState.isHost ? 'border-t-green-500' : 'border-t-white/95'}`} 
        />
      </motion.div>

      {/* 青蛙 SVG - 使用用户提供的高清矢量图 */}
      <motion.img
        src="/garden/frog-cute.svg"
        alt={frogState.frog.name}
        width={100} // SVG 可以稍微大一点
        height={100}
        style={{ 
          transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)',
          // 保留色相旋转，但减少阴影（因为SVG内部自带了）
          filter: `hue-rotate(${frogState.frogId * 60}deg)`,
          // 移除 mix-blend-mode，SVG 自带透明
        }}
        animate={activity === 'sleeping' ? { rotate: [-2, 2, -2] } : {}} // 配合SVG内部呼吸动画
        transition={{ duration: 4, repeat: Infinity }}
        draggable={false}
      />

      {/* 活动状态表情 */}
      <AnimatePresence>
        {activity === 'eating' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-2 -right-2 text-xl"
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.3, repeat: 3 }}
            >
              😋
            </motion.span>
          </motion.div>
        )}
        
        {activity === 'sleeping' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-4 -right-4"
          >
            <motion.span
              className="text-lg"
              animate={{ y: [0, -8, -16], opacity: [1, 0.8, 0], scale: [1, 1.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              💤
            </motion.span>
          </motion.div>
        )}
        
        {activity === 'greeting' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2"
          >
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              👋
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主人皇冠标识 */}
      {frogState.isHost && (
        <motion.div
          className="absolute -top-3 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-lg">👑</span>
        </motion.div>
      )}
    </motion.div>
  );
};


