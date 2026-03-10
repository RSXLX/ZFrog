import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronLeft } from 'lucide-react';

// Mobile Bottom Navigation
interface MobileNavProps {
  items: {
    icon: ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
  }[];
}

export function MobileBottomNav({ items }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
              item.active
                ? 'text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Mobile Header
interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
}

export function MobileHeader({ title, showBack, onBack, rightContent }: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center flex-1">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 mr-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        </div>
        {rightContent && (
          <div className="flex items-center ml-4">{rightContent}</div>
        )}
      </div>
    </div>
  );
}

// Mobile Drawer
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'left' | 'right' | 'bottom';
}

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}: MobileDrawerProps) {
  const positionClasses = {
    left: 'left-0 top-0 bottom-0 w-80',
    right: 'right-0 top-0 bottom-0 w-80',
    bottom: 'left-0 right-0 bottom-0 h-96',
  };

  const animationVariants = {
    left: { hidden: { x: '-100%' }, visible: { x: 0 } },
    right: { hidden: { x: '100%' }, visible: { x: 0 } },
    bottom: { hidden: { y: '100%' }, visible: { y: 0 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={animationVariants[position].hidden}
            animate={animationVariants[position].visible}
            exit={animationVariants[position].hidden}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed ${positionClasses[position]} bg-white z-50 md:hidden shadow-xl`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-4 overflow-y-auto h-full">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile Pull-to-Refresh
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const handleTouchStart = () => {
    if (window.scrollY === 0) {
      setPullProgress(0);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (window.scrollY === 0 && e.touches[0].clientY > 0) {
      const progress = Math.min((e.touches[0].clientY / 200) * 100, 100);
      setPullProgress(progress);
    }
  };

  const handleTouchEnd = async () => {
    if (pullProgress >= 100) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
      }
    } else {
      setPullProgress(0);
    }
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      {pullProgress > 0 && (
        <div
          className="absolute top-0 left-0 right-0 h-20 bg-green-500 flex items-center justify-center z-50"
          style={{ opacity: pullProgress / 100 }}
        >
          <div className="text-white font-medium">
            {isRefreshing ? '刷新中...' : pullProgress >= 100 ? '松开刷新' : '下拉刷新'}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
