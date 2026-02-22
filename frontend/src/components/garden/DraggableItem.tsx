/**
 * DraggableItem - V2.0 可拖拽装饰品组件
 * 
 * 功能:
 * - V2.0: 网格吸附 (Snap-to-grid)
 * - V2.0: 实时冲突检测反馈
 * - 拖拽移动
 * - 缩放/旋转 (可选)
 * - 乐观更新
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { GRID_CONFIG, GridPosition } from '../../hooks/useGridEditor';

// V2.0: 支持网格坐标
export interface PlacedItemData {
  id: string;
  userDecorationId: string;
  // V1.0 兼容
  x?: number;
  y?: number;
  // V2.0 网格坐标
  gridX: number;
  gridY: number;
  scale: number;
  rotation: number;
  zIndex: number;
  decoration: {
    id: string;
    name: string;
    assetUrl: string;
    width: number;
    height: number;
    gridWidth: number;
    gridHeight: number;
    isInteractive: boolean;
    rarity?: number;
    buffType?: string;
  };
}

interface DraggableItemProps {
  item: PlacedItemData;
  containerSize: { width: number; height: number };
  isEditMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, gridX: number, gridY: number) => void;
  onInteract?: (id: string) => void;
  // V2.0: 拖拽预览回调
  onDragPreview?: (gridX: number, gridY: number) => void;
  onDragEnd?: () => void;
  // V2.0: 冲突状态
  isConflict?: boolean;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  containerSize,
  isEditMode,
  isSelected,
  onSelect,
  onMove,
  onInteract,
  onDragPreview,
  onDragEnd,
  isConflict = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // V2.0: 将网格坐标转换为像素位置（左上角）
  const pixelPosition = useMemo(() => {
    return {
      x: item.gridX * GRID_CONFIG.cellSize,
      y: item.gridY * GRID_CONFIG.cellSize,
    };
  }, [item.gridX, item.gridY]);
  
  // V2.0: 计算实际尺寸（考虑旋转）
  const effectiveSize = useMemo(() => {
    const rotation = item.rotation || 0;
    const isRotated = rotation === 90 || rotation === 270;
    return {
      width: (isRotated ? item.decoration.gridHeight : item.decoration.gridWidth) * GRID_CONFIG.cellSize,
      height: (isRotated ? item.decoration.gridWidth : item.decoration.gridHeight) * GRID_CONFIG.cellSize,
    };
  }, [item.rotation, item.decoration.gridWidth, item.decoration.gridHeight]);
  
  // 处理拖拽开始
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
  }, []);
  
  // V2.0: 处理拖拽中 - 实时预览
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isEditMode) return;
    
    // 计算当前拖拽位置的网格坐标
    const currentX = pixelPosition.x + info.offset.x;
    const currentY = pixelPosition.y + info.offset.y;
    
    const gridX = Math.round(currentX / GRID_CONFIG.cellSize);
    const gridY = Math.round(currentY / GRID_CONFIG.cellSize);
    
    // 限制在边界内
    const clampedGridX = Math.max(0, Math.min(GRID_CONFIG.cols - item.decoration.gridWidth, gridX));
    const clampedGridY = Math.max(0, Math.min(GRID_CONFIG.rows - item.decoration.gridHeight, gridY));
    
    // 更新拖拽预览
    onDragPreview?.(clampedGridX, clampedGridY);
    
    // 保存偏移用于吸附动画
    setDragOffset({ x: info.offset.x, y: info.offset.y });
  }, [isEditMode, pixelPosition, item.decoration.gridWidth, item.decoration.gridHeight, onDragPreview]);
  
  // V2.0: 处理拖拽结束 - 网格吸附
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isEditMode) return;
    
    // 计算最终的网格坐标（吸附）
    const finalX = pixelPosition.x + info.offset.x;
    const finalY = pixelPosition.y + info.offset.y;
    
    const gridX = Math.round(finalX / GRID_CONFIG.cellSize);
    const gridY = Math.round(finalY / GRID_CONFIG.cellSize);
    
    // 限制在边界内
    const clampedGridX = Math.max(0, Math.min(GRID_CONFIG.cols - item.decoration.gridWidth, gridX));
    const clampedGridY = Math.max(0, Math.min(GRID_CONFIG.rows - item.decoration.gridHeight, gridY));
    
    // 如果没有冲突，更新位置
    if (!isConflict) {
      onMove(item.id, clampedGridX, clampedGridY);
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    onDragEnd?.();
  }, [isEditMode, pixelPosition, item.id, item.decoration.gridWidth, item.decoration.gridHeight, isConflict, onMove, onDragEnd]);

  // 处理点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isEditMode) {
      onSelect(item.id);
    } else if (item.decoration.isInteractive && onInteract) {
      onInteract(item.id);
    }
  }, [isEditMode, item.id, item.decoration.isInteractive, onSelect, onInteract]);

  // V2.0: 编辑模式下非交互物品半透明
  const editModeOpacity = isEditMode && !item.decoration.isInteractive && !isSelected && !isDragging 
    ? 0.6 
    : 1;

  return (
    <motion.div
      className={`absolute cursor-pointer select-none ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      } ${isDragging ? 'z-50' : ''} ${
        isConflict && isDragging ? 'ring-2 ring-red-500' : ''
      }`}
      style={{
        left: pixelPosition.x,
        top: pixelPosition.y,
        width: effectiveSize.width,
        height: effectiveSize.height,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: isDragging ? 1000 : item.zIndex,
        opacity: editModeOpacity,
      }}
      drag={isEditMode}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileHover={{ scale: isEditMode ? 1.02 : 1 }}
      whileTap={{ scale: isEditMode ? 0.98 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap
                        shadow-lg flex items-center gap-2">
          <span>{item.decoration.name}</span>
          {item.decoration.rarity && (
            <span className="text-yellow-400">{'★'.repeat(item.decoration.rarity)}</span>
          )}
        </div>
      )}
      
      {/* V2.0: Buff 指示器 */}
      {item.decoration.buffType && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full 
                        flex items-center justify-center text-xs text-white shadow-lg">
          ⚡
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
      
      {/* 拖拽中的冲突警告 */}
      {isDragging && isConflict && (
        <motion.div
          className="absolute inset-0 bg-red-500/30 rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-red-500 text-2xl">⚠️</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DraggableItem;
