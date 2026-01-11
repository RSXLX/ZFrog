import { useState, useCallback, useRef, useEffect } from 'react';

export type DockPosition = 'left' | 'right' | 'top' | 'bottom';

interface UseDragAndDockOptions {
  initialPosition: DockPosition;
  initialOffset: number;
  threshold?: number;
  onDockChange?: (position: DockPosition, offset: number) => void;
  enabled?: boolean;
}

interface UseDragAndDockReturn {
  isDragging: boolean;
  currentPosition: DockPosition;
  currentOffset: number;
  previewPosition: DockPosition | null;
  handleDragStart: (e: React.PointerEvent) => void;
}

export function useDragAndDock({
  initialPosition,
  initialOffset,
  threshold = 50,
  onDockChange,
  enabled = true,
}: UseDragAndDockOptions): UseDragAndDockReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<DockPosition>(initialPosition);
  const [currentOffset, setCurrentOffset] = useState(initialOffset);
  const [previewPosition, setPreviewPosition] = useState<DockPosition | null>(null);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);

  const calculateDockPosition = useCallback((clientX: number, clientY: number): {
    position: DockPosition;
    offset: number;
  } => {
    const { innerWidth, innerHeight } = window;
    
    // 计算到各边界的距离
    const distToLeft = clientX;
    const distToRight = innerWidth - clientX;
    const distToTop = clientY;
    const distToBottom = innerHeight - clientY;
    
    // 找到最近的边界
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    let position: DockPosition;
    let offset: number;
    
    if (minDist === distToLeft && distToLeft < threshold) {
      position = 'left';
      offset = (clientY / innerHeight) * 100;
    } else if (minDist === distToRight && distToRight < threshold) {
      position = 'right';
      offset = (clientY / innerHeight) * 100;
    } else if (minDist === distToTop && distToTop < threshold) {
      position = 'top';
      offset = (clientX / innerWidth) * 100;
    } else if (minDist === distToBottom && distToBottom < threshold) {
      position = 'bottom';
      offset = (clientX / innerWidth) * 100;
    } else {
      // 默认保持当前位置，更新偏移
      position = currentPosition;
      if (position === 'left' || position === 'right') {
        offset = (clientY / innerHeight) * 100;
      } else {
        offset = (clientX / innerWidth) * 100;
      }
    }
    
    // 限制偏移范围
    offset = Math.max(10, Math.min(90, offset));
    
    return { position, offset };
  }, [currentPosition, threshold]);

  const handleDragMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    
    const { position, offset } = calculateDockPosition(e.clientX, e.clientY);
    
    // 如果接近边界，显示预览
    const { innerWidth, innerHeight } = window;
    const distToLeft = e.clientX;
    const distToRight = innerWidth - e.clientX;
    const distToTop = e.clientY;
    const distToBottom = innerHeight - e.clientY;
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    if (minDist < threshold) {
      setPreviewPosition(position);
    } else {
      setPreviewPosition(null);
    }
    
    setCurrentPosition(position);
    setCurrentOffset(offset);
  }, [isDragging, calculateDockPosition, threshold]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setPreviewPosition(null);
    pointerIdRef.current = null;
    
    // 通知外部
    onDockChange?.(currentPosition, currentOffset);
  }, [currentPosition, currentOffset, onDockChange]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;
    
    // 捕获指针
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled]);

  // 全局事件监听
  useEffect(() => {
    if (!isDragging) return;
    
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);
    
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 同步外部初始值
  useEffect(() => {
    setCurrentPosition(initialPosition);
    setCurrentOffset(initialOffset);
  }, [initialPosition, initialOffset]);

  return {
    isDragging,
    currentPosition,
    currentOffset,
    previewPosition,
    handleDragStart,
  };
}
