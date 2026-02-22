import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GardenState, GardenFrogState } from '../../types/garden';
import { GardenFrog } from './GardenFrog';
import { SceneObject } from './SceneObject';
import { homeApi, GridPlacedItemInput } from '../../services/home.api';
import useGridEditor, { GridItem, GRID_CONFIG } from '../../hooks/useGridEditor';
import GridOverlay from './GridOverlay';
import DraggableItem, { PlacedItemData } from './DraggableItem';
import DecorationInventory, { InventoryItem } from './DecorationInventory';

interface GardenSceneProps {
  gardenState: GardenState;
  onFrogClick: (frogState: GardenFrogState) => void;
  onMailboxClick: () => void;
  onParcelClick: () => void;
  hasNewMail: boolean;
  hasNewGift: boolean;
  currentUserFrogId?: number; // 当前登录用户的青蛙 ID
}

// 场景类型
type SceneType = 'yard' | 'indoor';
type TimeType = 'day' | 'night';

// 三叶草位置数据
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
    className="absolute cursor-pointer z-10" // z-10 确保在底层但不被遮挡
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
  hasNewGift,
  currentUserFrogId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 800, height: 600 });
  const [sceneType, setSceneType] = useState<SceneType>('yard');
  const [timeType, setTimeType] = useState<TimeType>('day');
  const [clovers, setClovers] = useState(CLOVER_POSITIONS);
  const [collectedCount, setCollectedCount] = useState(0);
  
  // 视差效果状态
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // V2.0: 装饰品数据
  const [placedItems, setPlacedItems] = useState<GridItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [placingItem, setPlacingItem] = useState<InventoryItem | null>(null);
  const [comfortData, setComfortData] = useState<{ score: number; level: string; buffs: any[] } | null>(null);

  // V2.0: 网格编辑 Hook
  const {
    mode,
    setMode,
    selectItem,
    selectedItemId,
    checkCollision,
    acquireLock,
    releaseLock,
    updateDragPreview,
    clearDragPreview,
    dragPreview,
    isConflict,
    buildOccupiedGrid,
    sessionId,
    hasEditLock
  } = useGridEditor(placedItems);

  // 1. 初始化: 时间和尺寸
  useEffect(() => {
    const hour = new Date().getHours();
    setTimeType(hour >= 18 || hour < 6 ? 'night' : 'day');

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

  // 2. 加载布局数据
  const loadLayout = useCallback(async () => {
    if (!gardenState.ownerFrog) return;
    try {
      const res = await homeApi.getLayout(gardenState.ownerFrog.id, sceneType);
      if (res.data) {
        // 转换 API 数据到 GridItem
        const items: GridItem[] = res.data.items.map((item: any) => ({
          id: item.id,
          userDecorationId: item.userDecorationId,
          gridX: item.gridX ?? Math.round((item.x || 0) * 0.11), // 兼容转换
          gridY: item.gridY ?? Math.round((item.y || 0) * 0.09),
          gridWidth: item.userDecoration.decoration.gridWidth || 1,
          gridHeight: item.userDecoration.decoration.gridHeight || 1,
          rotation: item.rotation || 0,
          scale: item.scale || 1,
          zIndex: item.zIndex || 1,
          decoration: {
            ...item.userDecoration.decoration,
            gridWidth: item.userDecoration.decoration.gridWidth || 1,
            gridHeight: item.userDecoration.decoration.gridHeight || 1,
          }
        }));
        setPlacedItems(items);
        setComfortData({
            score: res.data.comfortScore || 0,
            level: '未知', // TODO: 从后端获取
            buffs: [] // TODO: 从后端获取
        });
      }
    } catch (err) {
      console.error('Failed to load layout:', err);
    }
  }, [gardenState.ownerFrog, sceneType]);

  useEffect(() => {
    loadLayout();
    // 同时加载舒适度
    if (gardenState.ownerFrog) {
        homeApi.getComfort(gardenState.ownerFrog.id, sceneType).then(res => {
            if (res.data) {
                setComfortData({
                    score: res.data.comfortScore,
                    level: res.data.level,
                    buffs: res.data.activeBuffs
                });
            }
        });
    }
  }, [loadLayout, gardenState.ownerFrog, sceneType]);

  // 3. 加载库存
  const loadInventory = useCallback(async () => {
    if (!currentUserFrogId) return;
    try {
      const res = await homeApi.getUnplacedDecorations(currentUserFrogId, sceneType);
      if (res.data) {
        setInventoryItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  }, [currentUserFrogId, sceneType]);

  useEffect(() => {
    if (mode === 'edit') {
      loadInventory();
    }
  }, [mode, loadInventory]);

  // 4. 处理模式切换（包含编辑锁逻辑）
  const toggleEditMode = async () => {
    if (mode === 'browse') {
      if (!currentUserFrogId || !gardenState.ownerFrog || currentUserFrogId !== gardenState.ownerFrog.id) {
        alert('只有主人可以编辑家园哦！');
        return;
      }
      // 获取锁
      const locked = await acquireLock(gardenState.ownerFrog.id, sceneType);
      if (locked) {
        setMode('edit');
        setIsInventoryOpen(true);
      } else {
        alert('无法获取编辑锁，可能其他设备正在编辑。');
      }
    } else {
      // 退出编辑前询问保存
      if (confirm('要保存当前的布置吗？')) {
        await handleSaveLayout();
      }
      
      // 释放锁
      if (gardenState.ownerFrog) {
        await releaseLock(gardenState.ownerFrog.id, sceneType);
      }
      setMode('browse');
      setIsInventoryOpen(false);
      setPlacingItem(null);
      selectItem(null);
      // 重新加载以确保同步
      loadLayout(); 
    }
  };

  // 5. 保存布局
  const handleSaveLayout = async () => {
    if (!gardenState.ownerFrog) return;
    try {
      const itemsToSave: GridPlacedItemInput[] = placedItems.map(item => ({
        userDecorationId: item.userDecorationId,
        gridX: item.gridX,
        gridY: item.gridY,
        scale: item.scale,
        rotation: item.rotation,
        zIndex: item.zIndex
      }));

      await homeApi.saveLayoutV2(gardenState.ownerFrog.id, sceneType, itemsToSave, {
        sessionId,
        createSnapshot: true
      });
      console.log('Layout saved successfully');
      alert('保存成功！舒适度已更新。');
      loadLayout(); // 刷新数据（包括舒适度）
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert('保存失败，请重试。');
    }
  };

  // 6. 交互逻辑
  const handleMoveItem = (id: string, gridX: number, gridY: number) => {
    setPlacedItems(prev => prev.map(item => 
      item.id === id ? { ...item, gridX, gridY } : item
    ));
    clearDragPreview();
  };

  const handlePlaceNewItem = (gridX: number, gridY: number) => {
    if (!placingItem) return;

    const newItem: GridItem = {
      id: `temp_${Date.now()}`,
      userDecorationId: placingItem.id,
      gridX,
      gridY,
      gridWidth: placingItem.decoration.width ? Math.ceil(placingItem.decoration.width / 64) : 1, // 估算或从 backend 获取准确数据
      gridHeight: placingItem.decoration.height ? Math.ceil(placingItem.decoration.height / 64) : 1,
      rotation: 0,
      scale: 1,
      zIndex: 1,
      decoration: {
        ...placingItem.decoration,
        gridWidth: placingItem.decoration.width ? Math.ceil(placingItem.decoration.width / 64) : 1, // 这里需要确保类型一致，实际应从 InventoryItem 里取
        gridHeight: placingItem.decoration.height ? Math.ceil(placingItem.decoration.height / 64) : 1,
        isInteractive: false // 默认
      }
    };

    // 检查冲突
    const collision = checkCollision(newItem);
    if (!collision.hasCollision && !collision.outOfBounds) {
      setPlacedItems(prev => [...prev, newItem]);
      // 减少库存显示
      setInventoryItems(prev => prev.map(item => 
        item.id === placingItem.id ? { ...item, amount: item.amount - 1 } : item
      ).filter(item => item.amount > 0));
      
      setPlacingItem(null);
    } else {
      alert('这里放不下哦！');
    }
  };

  // 点击网格单元格（用于放置新物品）
  const handleCellClick = (gridX: number, gridY: number) => {
    if (mode === 'edit' && placingItem) {
      handlePlaceNewItem(gridX, gridY);
    } else {
        // 如果点击空白处，取消选择
        selectItem(null);
    }
  };

  const handleInventorySelect = (item: InventoryItem) => {
    setPlacingItem(item);
    // 自动切换到放置模式，或者只是选中
  };

  // 视差和背景
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePosition({ x, y });
  };

  const getBackgroundImage = () => {
    if (sceneType === 'indoor') return '/garden/home_indoor.png';
    return timeType === 'night' ? '/garden/yard_night.png' : '/garden/yard_day.png';
  };

  // 构建青蛙状态（复用原逻辑）
  // ... (省略 getInitialPosition 实现，保持原样或简化)
  const getInitialPosition = (index: number, isHost: boolean) => {
     // 简化实现
     return isHost ? { x: 50, y: 50 } : { x: 30 + index * 10, y: 60 };
  };

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
        visitStartedAt: visit.startedAt,
        isHost: false
      }))
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onMouseMove={handleMouseMove}
    >
      {/* 背景图 */}
      <motion.div
        key={`${sceneType}-${timeType}`}
        animate={{ 
          x: mousePosition.x * -20,
          y: mousePosition.y * -10,
          scale: 1.1 
        }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${getBackgroundImage()})` }}
      />

      {/* V2.0: 网格层 (仅编辑模式显示) */}
      <GridOverlay
        visible={mode === 'edit'}
        occupiedGrid={buildOccupiedGrid(placedItems, selectedItemId || undefined)}
        dragPreview={dragPreview}
        previewWidth={placingItem ? Math.ceil(placingItem.decoration.width / 64) : (selectedItemId ? placedItems.find(i => i.id === selectedItemId)?.gridWidth : 1)}
        previewHeight={placingItem ? Math.ceil(placingItem.decoration.height / 64) : (selectedItemId ? placedItems.find(i => i.id === selectedItemId)?.gridHeight : 1)}
        isConflict={isConflict}
        onCellClick={handleCellClick}
      />

      {/* 装饰品层 */}
      <AnimatePresence>
        {placedItems.map(item => (
          <DraggableItem
            key={item.id}
            item={item as PlacedItemData} // 类型断言，确保 GridItem 兼容 PlacedItemData
            containerSize={sceneSize}
            isEditMode={mode === 'edit'}
            isSelected={selectedItemId === item.id}
            onSelect={selectItem}
            onMove={handleMoveItem}
            onDragPreview={updateDragPreview}
            onDragEnd={clearDragPreview}
            isConflict={selectedItemId === item.id && isConflict}
          />
        ))}
      </AnimatePresence>

      {/* 青蛙层 */}
      {frogStates.map((frogState) => (
        <GardenFrog
          key={frogState.frogId}
          frogState={frogState}
          sceneSize={sceneSize}
          onClick={() => onFrogClick(frogState)}
        />
      ))}

      {/* V2.0: UI 覆盖层 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-50">
        {/* 左上角：资源 & 舒适度 */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* 三叶草 */}
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <img src="/garden/clover.png" alt="" className="w-5 h-5" />
            <span className="font-bold text-green-700">{collectedCount}</span>
          </div>
          
          {/* 舒适度 (新) */}
          {comfortData && (
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span>🏠</span>
              <div className="flex flex-col leading-none">
                <span className="text-xs text-gray-500">舒适度</span>
                <span className="font-bold text-amber-600">{comfortData.level} ({comfortData.score})</span>
              </div>
            </div>
          )}
        </div>

        {/* 右上角：操作按钮 */}
        <div className="flex gap-2 pointer-events-auto">
          {/* 编辑按钮 (仅 Owner) */}
          {currentUserFrogId === gardenState.ownerFrog?.id && (
            <button
              onClick={toggleEditMode}
              className={`p-3 rounded-full shadow-lg transition-all font-bold ${
                mode === 'edit' 
                  ? 'bg-green-500 text-white ring-4 ring-green-200' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {mode === 'edit' ? '💾 保存' : '🔨 装修'}
            </button>
          )}

          {/* 场景切换 (仅浏览模式) */}
          {mode === 'browse' && (
            <>
              <button
                onClick={() => setSceneType('yard')}
                className={`p-3 rounded-full shadow-lg transition-all ${
                  sceneType === 'yard' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                🌳
              </button>
              <button
                onClick={() => setSceneType('indoor')}
                className={`p-3 rounded-full shadow-lg transition-all ${
                  sceneType === 'indoor' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                🏠
              </button>
            </>
          )}
        </div>
      </div>

      {/* 放置中提示 */}
      {mode === 'edit' && placingItem && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 
                        bg-black/70 text-white px-4 py-2 rounded-full pointer-events-none z-50">
          请点击网格放置: {placingItem.decoration.name}
        </div>
      )}

      {/* V2.0: 装饰品库存 */}
      {mode === 'edit' && (
        <DecorationInventory
          items={inventoryItems}
          isOpen={isInventoryOpen}
          onToggle={() => setIsInventoryOpen(!isInventoryOpen)}
          onSelectItem={handleInventorySelect}
          selectedItemId={placingItem?.id}
        />
      )}
    </div>
  );
};

