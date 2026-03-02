import { useState, useCallback, useRef, useEffect } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  duration?: number;
}

export function useLongPress({ onLongPress, onPress, duration = 800 }: LongPressOptions) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      onLongPress();
    }, duration);
  }, [onLongPress, duration]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressing && onPress) {
      onPress();
    }
    setIsLongPressing(false);
  }, [isLongPressing, onPress]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    isLongPressing,
    longPressProps: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
    },
  };
}
