/**
 * 虚拟滚动旅行列表 (P1前端优化)
 * 支持百万级数据流畅渲染
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import { Travel, TravelStatus } from '../../types';
import { TravelCard } from './TravelCard';
import { TravelCardSkeleton } from './TravelCardSkeleton';

interface VirtualTravelListProps {
  travels: Travel[];
  onLoadMore?: () => void;
  onTravelClick?: (travel: Travel) => void;
  hasMore?: boolean;
  isLoading?: boolean;
  itemHeight?: number;
  overscan?: number;
}

export const VirtualTravelList: React.FC<VirtualTravelListProps> = ({
  travels,
  onLoadMore,
  onTravelClick,
  hasMore = false,
  isLoading = false,
  itemHeight = 180,
  overscan = 5,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // 虚拟滚动核心
  const virtualizer = useVirtualizer({
    count: travels.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    onRangeChange: (start, end) => {
      setVisibleRange({ start, end });
      
      // 自动加载更多
      if (hasMore && !isLoading && end >= travels.length - 5) {
        onLoadMore?.();
      }
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  // 预加载附近数据
  useEffect(() => {
    const preloadStart = Math.max(0, visibleRange.start - 3);
    const preloadEnd = Math.min(travels.length, visibleRange.end + 3);
    
    // 触发预加载（图片、详情等）
    for (let i = preloadStart; i < preloadEnd; i++) {
      const travel = travels[i];
      if (travel?.id) {
        // 预加载标记
        travel._preloading = true;
      }
    }
  }, [visibleRange, travels]);

  // 渲染单个项目
  const renderItem = useCallback((virtualItem: VirtualItem) => {
    const isLoader = virtualItem.index >= travels.length;
    
    if (isLoader) {
      return (
        <div
          key="loader"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: itemHeight,
            transform: `translateY(${virtualItem.start}px)`,
          }}
          className="flex items-center justify-center p-4"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500">加载更多...</span>
            </div>
          ) : hasMore ? (
            <button
              onClick={onLoadMore}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              加载更多
            </button>
          ) : null}
        </div>
      );
    }

    const travel = travels[virtualItem.index];
    if (!travel) return null;

    return (
      <div
        key={travel.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: itemHeight,
          transform: `translateY(${virtualItem.start}px)`,
        }}
        className="p-2"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TravelCard
            travel={travel}
            onClick={() => onTravelClick?.(travel)}
          />
        </motion.div>
      </div>
    );
  }, [travels, isLoading, hasMore, itemHeight, onLoadMore, onTravelClick]);

  // 总高度
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ willChange: 'transform' }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map(renderItem)}
      </div>
    </div>
  );
};

// 使用示例和性能优化
export const useVirtualTravelList = (props: VirtualTravelListProps) => {
  return {
    Component: VirtualTravelList,
    props,
  };
};
