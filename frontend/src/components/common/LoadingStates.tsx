import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'text-green-500',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} ${color} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="10"
        />
      </svg>
    </motion.div>
  );
}

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingDots({ 
  size = 'md', 
  color = 'bg-green-500',
  className = '' 
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className={`${sizeClasses[size]} ${color} rounded-full`}
        />
      ))}
    </div>
  );
}

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  circle = false 
}: SkeletonProps) {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ width, height }}
      className={`bg-gray-200 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}

interface LoadingPageProps {
  message?: string;
  showSpinner?: boolean;
  children?: ReactNode;
}

export function LoadingPage({ 
  message = '加载中...', 
  showSpinner = true,
  children 
}: LoadingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-emerald-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {showSpinner && (
          <div className="mb-6">
            <LoadingSpinner size="xl" />
          </div>
        )}
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-500">请稍候...</p>
        
        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Export all loading components
export { LoadingSpinner, LoadingDots, Skeleton, LoadingPage };
