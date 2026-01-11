import React from 'react';

type DockPosition = 'left' | 'right' | 'top' | 'bottom';

interface Size {
  width: number;
  height: number;
}

interface UsePanelPositionOptions {
  dockPosition: DockPosition;
  offset: number;
  size: Size;
}

/**
 * 计算面板位置样式
 */
export function usePanelPosition({
  dockPosition,
  offset,
  size,
}: UsePanelPositionOptions): React.CSSProperties {
  const baseOffset = `${offset}%`;
  
  if (dockPosition === 'left' || dockPosition === 'right') {
    return {
      position: 'fixed',
      [dockPosition]: 0,
      top: baseOffset,
      transform: 'translateY(-50%)',
      width: size.width,
      height: size.height,
    };
  } else {
    return {
      position: 'fixed',
      [dockPosition]: 0,
      left: baseOffset,
      transform: 'translateX(-50%)',
      width: size.width,
      height: size.height,
    };
  }
}

/**
 * 根据方向键计算新的贴边位置
 */
export function getNewDockPosition(
  current: DockPosition,
  direction: 'up' | 'down' | 'left' | 'right'
): DockPosition {
  const mapping: Record<string, DockPosition> = {
    'up': 'top',
    'down': 'bottom',
    'left': 'left',
    'right': 'right',
  };
  return mapping[direction] || current;
}
