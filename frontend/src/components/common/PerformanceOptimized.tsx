import { ReactNode, useEffect, useRef, useState, lazy, Suspense, ComponentType } from 'react';
import { motion, useInView } from 'framer-motion';
import { LoadingSpinner, Skeleton } from './LoadingStates';

// Lazy Image Component with Intersection Observer
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse">
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover blur-sm"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover ${className}`}
        />
      )}
    </div>
  );
}

// Virtual List Component for Large Lists
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
      
      setVisibleRange({ start, end });
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, overscan]);

  const totalHeight = items.length * itemHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={visibleRange.start + index}
            style={{
              position: 'absolute',
              top: (visibleRange.start + index) * itemHeight,
              height: itemHeight,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, visibleRange.start + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lazy Loaded Component Wrapper
interface LazyComponentProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  props?: Record<string, any>;
}

export function LazyComponent({ component, fallback, props = {} }: LazyComponentProps) {
  const LazyLoadedComponent = lazy(component);

  return (
    <Suspense fallback={fallback || <LoadingSpinner size="lg" />}>
      <LazyLoadedComponent {...props} />
    </Suspense>
  );
}

// InView Component for Scroll-Triggered Animations
interface InViewProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  once?: boolean;
  animation?: 'fade' | 'slideUp' | 'slideLeft' | 'scale';
  delay?: number;
}

export function InView({
  children,
  className = '',
  threshold = 0.1,
  once = true,
  animation = 'fade',
  delay = 0,
}: InViewProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const animationVariants = {
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
    slideUp: { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } },
    slideLeft: { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0 } },
    scale: { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } },
  };

  const selectedAnimation = animationVariants[animation];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={selectedAnimation}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Export all performance components
export { LazyImage, VirtualList, LazyComponent, InView };
