import { useState, useEffect, useCallback, useRef } from 'react';
import { GardenFrogState, GardenFrogActivity } from '../types/garden';

interface MovementConfig {
  moveInterval: number;      // 移动间隔（毫秒）
  moveChance: number;        // 移动概率 (0-1)
  minX: number;              // X轴最小值 (%)
  maxX: number;              // X轴最大值 (%)
  minY: number;              // Y轴最小值 (%)
  maxY: number;              // Y轴最大值 (%)
  maxMoveDistance: number;   // 单次最大移动距离 (%)
  hopDuration: number;       // 蹦跳动画时长（毫秒）
}

const DEFAULT_CONFIG: MovementConfig = {
  moveInterval: 3000,
  moveChance: 0.3,
  minX: 10,
  maxX: 90,
  minY: 20,
  maxY: 80,
  maxMoveDistance: 15,
  hopDuration: 500,
};

interface UseGardenFrogMovementReturn {
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  isMoving: boolean;
  activity: GardenFrogActivity;
  facingRight: boolean;
  moveTo: (x: number, y: number) => void;
  setActivity: (activity: GardenFrogActivity) => void;
  pauseMovement: () => void;
  resumeMovement: () => void;
}

export const useGardenFrogMovement = (
  initialPosition: { x: number; y: number },
  isHost: boolean = false,
  config: Partial<MovementConfig> = {}
): UseGardenFrogMovementReturn => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [position, setPosition] = useState(initialPosition);
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [activity, setActivity] = useState<GardenFrogActivity>('idle');
  const [facingRight, setFacingRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // 生成随机目标位置
  const generateRandomTarget = useCallback(() => {
    const { minX, maxX, minY, maxY, maxMoveDistance } = mergedConfig;
    
    // 在当前位置附近生成目标
    const deltaX = (Math.random() - 0.5) * 2 * maxMoveDistance;
    const deltaY = (Math.random() - 0.5) * 2 * maxMoveDistance;
    
    const newX = Math.max(minX, Math.min(maxX, position.x + deltaX));
    const newY = Math.max(minY, Math.min(maxY, position.y + deltaY));
    
    return { x: newX, y: newY };
  }, [position, mergedConfig]);

  // 移动到指定位置
  const moveTo = useCallback((x: number, y: number) => {
    const { minX, maxX, minY, maxY } = mergedConfig;
    
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));
    
    setTargetPosition({ x: clampedX, y: clampedY });
    setFacingRight(clampedX > position.x);
    setIsMoving(true);
    setActivity('walking');
    
    // 蹦跳动画后更新位置
    setTimeout(() => {
      setPosition({ x: clampedX, y: clampedY });
      setTargetPosition(null);
      setIsMoving(false);
      setActivity('idle');
    }, mergedConfig.hopDuration);
  }, [position, mergedConfig]);

  // 暂停移动
  const pauseMovement = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 恢复移动
  const resumeMovement = useCallback(() => {
    setIsPaused(false);
  }, []);

  // 随机移动逻辑（仅访客）
  useEffect(() => {
    if (isHost || isPaused) return;

    intervalRef.current = setInterval(() => {
      // 根据概率决定是否移动
      if (Math.random() > mergedConfig.moveChance) return;
      
      // 如果正在移动，跳过
      if (isMoving) return;
      
      // 生成随机目标并移动
      const target = generateRandomTarget();
      moveTo(target.x, target.y);
    }, mergedConfig.moveInterval + Math.random() * 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHost, isPaused, isMoving, generateRandomTarget, moveTo, mergedConfig]);

  // 随机活动变化
  useEffect(() => {
    if (isHost || isPaused) return;

    const activityInterval = setInterval(() => {
      if (isMoving) return;
      
      const rand = Math.random();
      if (rand < 0.1) {
        // 10% 概率打哈欠
        setActivity('sleeping');
        setTimeout(() => setActivity('idle'), 3000);
      } else if (rand < 0.15) {
        // 5% 概率探索
        setActivity('exploring');
        setTimeout(() => setActivity('idle'), 2000);
      }
    }, 10000);

    return () => clearInterval(activityInterval);
  }, [isHost, isPaused, isMoving]);

  return {
    position,
    targetPosition,
    isMoving,
    activity,
    facingRight,
    moveTo,
    setActivity,
    pauseMovement,
    resumeMovement,
  };
};

// 碰撞检测工具函数
export const checkCollision = (
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
  minDistance: number = 10
): boolean => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < minDistance;
};

// 寻找不重叠的位置
export const findNonOverlappingPosition = (
  existingPositions: { x: number; y: number }[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  minDistance: number = 10,
  maxAttempts: number = 50
): { x: number; y: number } => {
  for (let i = 0; i < maxAttempts; i++) {
    const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    
    const hasCollision = existingPositions.some(pos => 
      checkCollision({ x, y }, pos, minDistance)
    );
    
    if (!hasCollision) {
      return { x, y };
    }
  }
  
  // 如果找不到，返回随机位置
  return {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
  };
};
