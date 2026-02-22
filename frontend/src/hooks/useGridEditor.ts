/**
 * useGridEditor - V2.0 网格编辑 Hook
 * 
 * 功能:
 * - 管理编辑模式状态
 * - 处理像素坐标到网格坐标的转换
 * - 本地冲突检测
 * - 编辑锁管理
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { homesteadApi } from '../services/home.api';

// 网格配置
export const GRID_CONFIG = {
  cols: 12,
  rows: 10,
  cellSize: 64,  // 像素
  canvasWidth: 768,  // 12 * 64
  canvasHeight: 640, // 10 * 64
};

// 编辑模式
export type EditorMode = 'browse' | 'edit';

// 网格位置
export interface GridPosition {
  gridX: number;
  gridY: number;
}

// 网格物品（带装饰品信息）
export interface GridItem {
  id: string;
  userDecorationId: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  rotation: number;
  scale: number;
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

// 冲突检测结果
export interface CollisionResult {
  hasCollision: boolean;
  outOfBounds: boolean;
  conflictingCells: Array<{ x: number; y: number }>;
}

// Hook 返回类型
export interface GridEditorState {
  // 状态
  mode: EditorMode;
  selectedItemId: string | null;
  dragPreview: GridPosition | null;
  isConflict: boolean;
  sessionId: string;
  hasEditLock: boolean;
  
  // 操作
  setMode: (mode: EditorMode) => void;
  selectItem: (id: string | null) => void;
  
  // 坐标转换
  pixelToGrid: (pixelX: number, pixelY: number) => GridPosition;
  gridToPixel: (gridX: number, gridY: number) => { x: number; y: number };
  
  // 冲突检测
  checkCollision: (item: GridItem, excludeItemId?: string) => CollisionResult;
  buildOccupiedGrid: (items: GridItem[], excludeItemId?: string) => boolean[][];
  
  // 拖拽预览
  updateDragPreview: (gridX: number, gridY: number) => void;
  clearDragPreview: () => void;
  
  // 编辑锁
  acquireLock: (frogId: number, sceneType: string) => Promise<boolean>;
  releaseLock: (frogId: number, sceneType: string) => Promise<void>;
}

// 生成唯一会话 ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * useGridEditor Hook
 */
export function useGridEditor(items: GridItem[]): GridEditorState {
  // 状态
  const [mode, setMode] = useState<EditorMode>('browse');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<GridPosition | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [hasEditLock, setHasEditLock] = useState(false);
  
  // 会话 ID（持久化）
  const sessionIdRef = useRef<string>(
    localStorage.getItem('homestead_session_id') || generateSessionId()
  );
  
  // 保存会话 ID
  useEffect(() => {
    localStorage.setItem('homestead_session_id', sessionIdRef.current);
  }, []);
  
  // 占用网格（计算优化）
  const occupiedGrid = useMemo(() => {
    return buildOccupiedGridFromItems(items, selectedItemId || undefined);
  }, [items, selectedItemId]);
  
  /**
   * 像素坐标转网格坐标
   */
  const pixelToGrid = useCallback((pixelX: number, pixelY: number): GridPosition => {
    const gridX = Math.floor(pixelX / GRID_CONFIG.cellSize);
    const gridY = Math.floor(pixelY / GRID_CONFIG.cellSize);
    return {
      gridX: Math.max(0, Math.min(GRID_CONFIG.cols - 1, gridX)),
      gridY: Math.max(0, Math.min(GRID_CONFIG.rows - 1, gridY)),
    };
  }, []);
  
  /**
   * 网格坐标转像素坐标（中心点）
   */
  const gridToPixel = useCallback((gridX: number, gridY: number) => {
    return {
      x: gridX * GRID_CONFIG.cellSize + GRID_CONFIG.cellSize / 2,
      y: gridY * GRID_CONFIG.cellSize + GRID_CONFIG.cellSize / 2,
    };
  }, []);
  
  /**
   * 检查冲突
   */
  const checkCollision = useCallback((
    item: GridItem,
    excludeItemId?: string
  ): CollisionResult => {
    const result: CollisionResult = {
      hasCollision: false,
      outOfBounds: false,
      conflictingCells: [],
    };
    
    // 考虑旋转后的宽高
    const rotation = item.rotation || 0;
    const effectiveWidth = rotation === 90 || rotation === 270 
      ? item.gridHeight 
      : item.gridWidth;
    const effectiveHeight = rotation === 90 || rotation === 270 
      ? item.gridWidth 
      : item.gridHeight;
    
    // 构建排除当前物品的占用网格
    const grid = buildOccupiedGridFromItems(items, excludeItemId || item.id);
    
    for (let x = item.gridX; x < item.gridX + effectiveWidth; x++) {
      for (let y = item.gridY; y < item.gridY + effectiveHeight; y++) {
        // 边界检查
        if (x < 0 || x >= GRID_CONFIG.cols || y < 0 || y >= GRID_CONFIG.rows) {
          result.outOfBounds = true;
          return result;
        }
        // 冲突检查
        if (grid[y]?.[x]) {
          result.hasCollision = true;
          result.conflictingCells.push({ x, y });
        }
      }
    }
    
    return result;
  }, [items]);
  
  /**
   * 构建占用网格
   */
  const buildOccupiedGrid = useCallback((
    itemList: GridItem[],
    excludeItemId?: string
  ): boolean[][] => {
    return buildOccupiedGridFromItems(itemList, excludeItemId);
  }, []);
  
  /**
   * 更新拖拽预览
   */
  const updateDragPreview = useCallback((gridX: number, gridY: number) => {
    setDragPreview({ gridX, gridY });
    
    // 如果有选中的物品，检查新位置是否冲突
    if (selectedItemId) {
      const selectedItem = items.find(i => i.id === selectedItemId);
      if (selectedItem) {
        const testItem = { ...selectedItem, gridX, gridY };
        const collision = checkCollision(testItem, selectedItemId);
        setIsConflict(collision.hasCollision || collision.outOfBounds);
      }
    }
  }, [selectedItemId, items, checkCollision]);
  
  /**
   * 清除拖拽预览
   */
  const clearDragPreview = useCallback(() => {
    setDragPreview(null);
    setIsConflict(false);
  }, []);
  
  /**
   * 选择物品
   */
  const selectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
  }, []);
  
  /**
   * 获取编辑锁
   */
  const acquireLock = useCallback(async (
    frogId: number,
    sceneType: string
  ): Promise<boolean> => {
    try {
      const result = await homesteadApi.acquireEditLock(
        frogId,
        sceneType,
        sessionIdRef.current
      );
      setHasEditLock(result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to acquire edit lock:', error);
      setHasEditLock(false);
      return false;
    }
  }, []);
  
  /**
   * 释放编辑锁
   */
  const releaseLock = useCallback(async (
    frogId: number,
    sceneType: string
  ): Promise<void> => {
    try {
      await homesteadApi.releaseEditLock(frogId, sceneType, sessionIdRef.current);
      setHasEditLock(false);
    } catch (error) {
      console.error('Failed to release edit lock:', error);
    }
  }, []);
  
  // 切换模式时自动获取/释放锁
  const handleModeChange = useCallback((newMode: EditorMode) => {
    setMode(newMode);
    if (newMode === 'browse') {
      setSelectedItemId(null);
      clearDragPreview();
    }
  }, [clearDragPreview]);
  
  return {
    mode,
    selectedItemId,
    dragPreview,
    isConflict,
    sessionId: sessionIdRef.current,
    hasEditLock,
    
    setMode: handleModeChange,
    selectItem,
    
    pixelToGrid,
    gridToPixel,
    
    checkCollision,
    buildOccupiedGrid,
    
    updateDragPreview,
    clearDragPreview,
    
    acquireLock,
    releaseLock,
  };
}

/**
 * 辅助函数：构建占用网格
 */
function buildOccupiedGridFromItems(
  items: GridItem[],
  excludeItemId?: string
): boolean[][] {
  const grid: boolean[][] = Array(GRID_CONFIG.rows)
    .fill(null)
    .map(() => Array(GRID_CONFIG.cols).fill(false));
  
  for (const item of items) {
    if (excludeItemId && item.id === excludeItemId) continue;
    
    const rotation = item.rotation || 0;
    const effectiveWidth = rotation === 90 || rotation === 270 
      ? item.gridHeight 
      : item.gridWidth;
    const effectiveHeight = rotation === 90 || rotation === 270 
      ? item.gridWidth 
      : item.gridHeight;
    
    for (let x = item.gridX; x < item.gridX + effectiveWidth; x++) {
      for (let y = item.gridY; y < item.gridY + effectiveHeight; y++) {
        if (x >= 0 && x < GRID_CONFIG.cols && y >= 0 && y < GRID_CONFIG.rows) {
          grid[y][x] = true;
        }
      }
    }
  }
  
  return grid;
}

export default useGridEditor;
