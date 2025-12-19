import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

interface FriendCardSkeletonProps {
  count?: number;
}

export const FriendCardSkeleton: React.FC<FriendCardSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2 gap-2">
                <Skeleton width={120} height={24} variant="text" />
                <Skeleton width={60} height={20} variant="text" />
              </div>
              
              <div className="mb-2">
                <Skeleton width="80%" height={16} variant="text" />
              </div>
              
              <div className="mb-3">
                <Skeleton width="100%" height={16} variant="text" />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Skeleton width={60} height={32} variant="rectangular" />
                <Skeleton width={60} height={32} variant="rectangular" />
                <Skeleton width={60} height={32} variant="rectangular" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface FriendRequestSkeletonProps {
  count?: number;
}

export const FriendRequestSkeleton: React.FC<FriendRequestSkeletonProps> = ({ count = 2 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Skeleton width={150} height={20} variant="text" />
            <Skeleton width={60} height={16} variant="text" />
          </div>
          
          <div className="mb-3">
            <Skeleton width="90%" height={16} variant="text" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Skeleton width={60} height={32} variant="rectangular" />
            <Skeleton width={60} height={32} variant="rectangular" />
            <Skeleton width={80} height={32} variant="rectangular" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
