import { useCallback, useRef } from 'react';

const SNAP_DISTANCE = 20;
const SCREEN_PADDING = 10;

export function useWindowSnap() {
  const lastPosition = useRef({ x: 0, y: 0 });

  const snapToEdge = useCallback((x: number, y: number, screenWidth: number, screenHeight: number) => {
    const windowWidth = 220;
    const windowHeight = 240;

    let newX = x;
    let newY = y;

    // Left edge
    if (Math.abs(x) < SNAP_DISTANCE) {
      newX = SCREEN_PADDING;
    }
    // Right edge
    else if (Math.abs(x + windowWidth - screenWidth) < SNAP_DISTANCE) {
      newX = screenWidth - windowWidth - SCREEN_PADDING;
    }

    // Top edge
    if (Math.abs(y) < SNAP_DISTANCE) {
      newY = SCREEN_PADDING;
    }
    // Bottom edge
    else if (Math.abs(y + windowHeight - screenHeight) < SNAP_DISTANCE) {
      newY = screenHeight - windowHeight - SCREEN_PADDING;
    }

    // Corner snap
    if (Math.abs(x) < SNAP_DISTANCE && Math.abs(y) < SNAP_DISTANCE) {
      newX = SCREEN_PADDING;
      newY = SCREEN_PADDING;
    } else if (Math.abs(x + windowWidth - screenWidth) < SNAP_DISTANCE && Math.abs(y) < SNAP_DISTANCE) {
      newX = screenWidth - windowWidth - SCREEN_PADDING;
      newY = SCREEN_PADDING;
    } else if (Math.abs(x) < SNAP_DISTANCE && Math.abs(y + windowHeight - screenHeight) < SNAP_DISTANCE) {
      newX = SCREEN_PADDING;
      newY = screenHeight - windowHeight - SCREEN_PADDING;
    } else if (Math.abs(x + windowWidth - screenWidth) < SNAP_DISTANCE && Math.abs(y + windowHeight - screenHeight) < SNAP_DISTANCE) {
      newX = screenWidth - windowWidth - SCREEN_PADDING;
      newY = screenHeight - windowHeight - SCREEN_PADDING;
    }

    if (newX !== x || newY !== y) {
      lastPosition.current = { x: newX, y: newY };
      return { x: newX, y: newY };
    }

    lastPosition.current = { x, y };
    return null;
  }, []);

  return { snapToEdge, lastPosition };
}
