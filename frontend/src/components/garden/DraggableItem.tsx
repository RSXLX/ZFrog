/**
 * DraggableItem - 可拖拽装饰品组件
 * 
 * 功能:
 * - 拖拽移动
 * - 缩放/旋转 (可选)
 * - 边界检测
 * - 乐观更新
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

export interface PlacedItemData {
  id: string;
  userDecorationId: string;
  x: number; // 百分比 0-100
  y: number; // 百分比 0-100
  scale: number;
  rotation: number;
  zIndex: number;
  decoration: {
    id: string;
    name: string;
    assetUrl: string;
    width: number;
    height: number;
    isInteractive: boolean;
  };
}

interface DraggableItemProps {
  item: PlacedItemData;
  containerSize: { width: number; height: number };
  isEditMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onInteract?: (id: string) => void;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  containerSize,
  isEditMode,
  isSelected,
  onSelect,
  onMove,
  onInteract,
}) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 将百分比转换为像素
  const pixelX = (item.x / 100) * containerSize.width;
  const pixelY = (item.y / 100) * containerSize.height;
  
  // Motion values for smooth dragging
  const x = useMotionValue(pixelX);
  const y = useMotionValue(pixelY);
  
  // 处理拖拽结束
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isEditMode) return;
      
      // 计算新的百分比位置
      const newX = Math.max(0, Math.min(100, (x.get() / containerSize.width) * 100));
      const newY = Math.max(0, Math.min(100, (y.get() / containerSize.height) * 100));
      
      onMove(item.id, newX, newY);
      setIsDragging(false);
    },
    [containerSize, isEditMode, item.id, onMove, x, y]
  );

  // 处理点击
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (isEditMode) {
        onSelect(item.id);
      } else if (item.decoration.isInteractive && onInteract) {
        onInteract(item.id);
      }
    },
    [isEditMode, item.id, item.decoration.isInteractive, onSelect, onInteract]
  );

  return (
    <motion.div
      className={`absolute cursor-pointer select-none ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      } ${isDragging ? 'z-50' : ''}`}
      style={{
        left: pixelX,
        top: pixelY,
        width: item.decoration.width * item.scale,
        height: item.decoration.height * item.scale,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: isDragging ? 1000 : item.zIndex,
      }}
      drag={isEditMode}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileHover={{ scale: isEditMode ? 1.05 : 1 }}
      whileTap={{ scale: isEditMode ? 0.95 : 1 }}
      animate={isDragging ? { scale: 1.1 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* 装饰品图片 */}
      <img
        src={item.decoration.assetUrl}
        alt={item.decoration.name}
        className="w-full h-full object-contain pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
      
      {/* 编辑模式指示器 */}
      {isEditMode && isSelected && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 
                        bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {item.decoration.name}
        </div>
      )}
      
      {/* 互动提示 */}
      {!isEditMode && item.decoration.isInteractive && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full 
                     flex items-center justify-center text-sm shadow-lg"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ✨
        </motion.div>
      )}
    </motion.div>
  );
};

export default DraggableItem;
