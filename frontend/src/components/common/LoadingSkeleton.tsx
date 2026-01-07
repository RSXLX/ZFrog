// frontend/src/components/common/LoadingSkeleton.tsx
import { memo } from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  type?: 'page' | 'card' | 'list' | 'detail';
  className?: string;
}

/**
 * 通用加载骨架屏组件
 * 用于 React.lazy 懒加载时的 fallback
 */
export const LoadingSkeleton = memo(function LoadingSkeleton({ 
  type = 'page',
  className = ''
}: LoadingSkeletonProps) {
  const shimmer = {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  };

  const shimmerClass = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';

  if (type === 'card') {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <motion.div {...shimmer} className={`h-6 w-3/4 rounded ${shimmerClass} mb-4`} />
        <motion.div {...shimmer} className={`h-4 w-full rounded ${shimmerClass} mb-2`} />
        <motion.div {...shimmer} className={`h-4 w-2/3 rounded ${shimmerClass}`} />
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow">
            <motion.div {...shimmer} className={`h-5 w-1/2 rounded ${shimmerClass} mb-3`} />
            <motion.div {...shimmer} className={`h-4 w-full rounded ${shimmerClass} mb-2`} />
            <motion.div {...shimmer} className={`h-4 w-3/4 rounded ${shimmerClass}`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className={`space-y-6 ${className}`}>
        <motion.div {...shimmer} className={`h-8 w-1/3 rounded ${shimmerClass}`} />
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <motion.div {...shimmer} className={`h-48 w-full rounded-lg ${shimmerClass} mb-4`} />
          <motion.div {...shimmer} className={`h-6 w-2/3 rounded ${shimmerClass} mb-3`} />
          <motion.div {...shimmer} className={`h-4 w-full rounded ${shimmerClass} mb-2`} />
          <motion.div {...shimmer} className={`h-4 w-5/6 rounded ${shimmerClass}`} />
        </div>
      </div>
    );
  }

  // Default: page skeleton
  return (
    <div className={`min-h-screen p-6 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <motion.div {...shimmer} className={`h-10 w-1/3 rounded-lg ${shimmerClass}`} />
        
        {/* Content skeleton */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <motion.div {...shimmer} className={`h-6 w-2/3 rounded ${shimmerClass}`} />
          <motion.div {...shimmer} className={`h-4 w-full rounded ${shimmerClass}`} />
          <motion.div {...shimmer} className={`h-4 w-5/6 rounded ${shimmerClass}`} />
          <motion.div {...shimmer} className={`h-4 w-4/5 rounded ${shimmerClass}`} />
        </div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow">
              <motion.div {...shimmer} className={`h-24 w-full rounded ${shimmerClass} mb-3`} />
              <motion.div {...shimmer} className={`h-5 w-1/2 rounded ${shimmerClass}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default LoadingSkeleton;
