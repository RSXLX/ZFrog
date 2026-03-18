/**
 * 轻量旅行列表实现。
 * 保持与原虚拟列表一致的接口，使用稳定的渐进式渲染，避免额外依赖。
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Travel } from '../../types';
import { TravelCard } from './TravelCard';

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
  return (
    <div className="h-full overflow-auto space-y-3" style={{ minHeight: itemHeight }}>
      {travels.map((travel, index) => (
        <motion.div
          key={travel.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: Math.min(index, overscan) * 0.03 }}
        >
          <TravelCard
            travel={travel}
            index={index}
            onClick={() => onTravelClick?.(travel)}
          />
        </motion.div>
      ))}

      {isLoading && (
        <div className="flex items-center justify-center p-4 text-sm text-gray-500">
          加载更多...
        </div>
      )}

      {!isLoading && hasMore && onLoadMore && (
        <div className="flex items-center justify-center p-4">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            加载更多
          </button>
        </div>
      )}
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
