/**
 * GridOverlay - V2.0 网格覆盖层组件
 * 
 * 功能:
 * - 渲染 12×10 网格线
 * - 高亮当前拖拽物品占用的网格
 * - 冲突区域显示红色
 * - 可放置区域显示绿色
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GRID_CONFIG, GridPosition } from '../../hooks/useGridEditor';

interface GridOverlayProps {
  visible: boolean;
  occupiedGrid: boolean[][];
  dragPreview: GridPosition | null;
  previewWidth?: number;
  previewHeight?: number;
  isConflict: boolean;
  onCellClick?: (gridX: number, gridY: number) => void;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  visible,
  occupiedGrid,
  dragPreview,
  previewWidth = 1,
  previewHeight = 1,
  isConflict,
  onCellClick,
}) => {
  // 生成网格单元格
  const cells = useMemo(() => {
    const result: Array<{
      x: number;
      y: number;
      isOccupied: boolean;
      isPreview: boolean;
      isConflictCell: boolean;
    }> = [];
    
    for (let y = 0; y < GRID_CONFIG.rows; y++) {
      for (let x = 0; x < GRID_CONFIG.cols; x++) {
        const isOccupied = occupiedGrid[y]?.[x] || false;
        
        // 检查是否在拖拽预览范围内
        let isPreview = false;
        let isConflictCell = false;
        
        if (dragPreview) {
          const inPreviewX = x >= dragPreview.gridX && x < dragPreview.gridX + previewWidth;
          const inPreviewY = y >= dragPreview.gridY && y < dragPreview.gridY + previewHeight;
          isPreview = inPreviewX && inPreviewY;
          
          if (isPreview && isOccupied) {
            isConflictCell = true;
          }
        }
        
        result.push({ x, y, isOccupied, isPreview, isConflictCell });
      }
    }
    
    return result;
  }, [occupiedGrid, dragPreview, previewWidth, previewHeight]);
  
  if (!visible) return null;
  
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        width: GRID_CONFIG.canvasWidth,
        height: GRID_CONFIG.canvasHeight,
      }}
    >
      {/* 网格线背景 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_CONFIG.cellSize}px ${GRID_CONFIG.cellSize}px`,
        }}
      />
      
      {/* 网格单元格 */}
      {cells.map((cell) => {
        // 确定单元格颜色
        let bgColor = 'transparent';
        let borderColor = 'transparent';
        
        if (cell.isPreview) {
          if (isConflict || cell.isConflictCell) {
            // 冲突 - 红色
            bgColor = 'rgba(239, 68, 68, 0.4)';
            borderColor = 'rgba(239, 68, 68, 0.8)';
          } else {
            // 可放置 - 绿色
            bgColor = 'rgba(34, 197, 94, 0.3)';
            borderColor = 'rgba(34, 197, 94, 0.8)';
          }
        } else if (cell.isOccupied) {
          // 已占用 - 淡灰色
          bgColor = 'rgba(156, 163, 175, 0.2)';
        }
        
        return (
          <div
            key={`${cell.x}-${cell.y}`}
            className="absolute transition-colors duration-150"
            style={{
              left: cell.x * GRID_CONFIG.cellSize,
              top: cell.y * GRID_CONFIG.cellSize,
              width: GRID_CONFIG.cellSize,
              height: GRID_CONFIG.cellSize,
              backgroundColor: bgColor,
              borderWidth: cell.isPreview ? 2 : 0,
              borderColor,
              borderStyle: 'solid',
              pointerEvents: onCellClick ? 'auto' : 'none',
            }}
            onClick={() => onCellClick?.(cell.x, cell.y)}
          />
        );
      })}
      
      {/* 边框 */}
      <div
        className="absolute inset-0 border-2 border-white/30 rounded-lg pointer-events-none"
        style={{
          width: GRID_CONFIG.canvasWidth,
          height: GRID_CONFIG.canvasHeight,
        }}
      />
      
      {/* 坐标标签（可选，调试用） */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {/* 列标签 */}
          <div className="absolute -top-6 left-0 right-0 flex">
            {Array.from({ length: GRID_CONFIG.cols }).map((_, i) => (
              <div
                key={`col-${i}`}
                className="text-white/50 text-xs text-center"
                style={{ width: GRID_CONFIG.cellSize }}
              >
                {i}
              </div>
            ))}
          </div>
          
          {/* 行标签 */}
          <div className="absolute top-0 bottom-0 -left-6 flex flex-col">
            {Array.from({ length: GRID_CONFIG.rows }).map((_, i) => (
              <div
                key={`row-${i}`}
                className="text-white/50 text-xs flex items-center justify-center"
                style={{ height: GRID_CONFIG.cellSize }}
              >
                {i}
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default GridOverlay;
