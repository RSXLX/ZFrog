import { useState, useCallback, useRef, useEffect } from 'react';

interface Size {
  width: number;
  height: number;
}

interface UseResizableOptions {
  initialSize: Size;
  minSize: Size;
  maxSize: Size;
  dockPosition: 'left' | 'right' | 'top' | 'bottom';
  onResize?: (size: Size) => void;
  enabled?: boolean;
}

interface UseResizableReturn {
  isResizing: boolean;
  currentSize: Size;
  handleResizeStart: (e: React.PointerEvent) => void;
}

export function useResizable({
  initialSize,
  minSize,
  maxSize,
  dockPosition,
  onResize,
  enabled = true,
}: UseResizableOptions): UseResizableReturn {
  const [isResizing, setIsResizing] = useState(false);
  const [currentSize, setCurrentSize] = useState<Size>(initialSize);
  
  const resizeStartRef = useRef({
    width: initialSize.width,
    height: initialSize.height,
    x: 0,
    y: 0,
  });

  const clampSize = useCallback((size: Size): Size => {
    return {
      width: Math.max(minSize.width, Math.min(maxSize.width, size.width)),
      height: Math.max(minSize.height, Math.min(maxSize.height, size.height)),
    };
  }, [minSize, maxSize]);

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    let newWidth = resizeStartRef.current.width;
    let newHeight = resizeStartRef.current.height;
    
    // 根据贴边方向计算新尺寸
    switch (dockPosition) {
      case 'left':
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = resizeStartRef.current.height + deltaY;
        break;
      case 'right':
        newWidth = resizeStartRef.current.width - deltaX;
        newHeight = resizeStartRef.current.height + deltaY;
        break;
      case 'top':
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = resizeStartRef.current.height + deltaY;
        break;
      case 'bottom':
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = resizeStartRef.current.height - deltaY;
        break;
    }
    
    const clampedSize = clampSize({ width: newWidth, height: newHeight });
    setCurrentSize(clampedSize);
  }, [isResizing, dockPosition, clampSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    onResize?.(currentSize);
  }, [currentSize, onResize]);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      width: currentSize.width,
      height: currentSize.height,
      x: e.clientX,
      y: e.clientY,
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled, currentSize]);

  // 全局事件监听
  useEffect(() => {
    if (!isResizing) return;
    
    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', handleResizeEnd);
    window.addEventListener('pointercancel', handleResizeEnd);
    
    return () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeEnd);
      window.removeEventListener('pointercancel', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // 同步外部初始值
  useEffect(() => {
    setCurrentSize(initialSize);
  }, [initialSize.width, initialSize.height]);

  return {
    isResizing,
    currentSize,
    handleResizeStart,
  };
}
