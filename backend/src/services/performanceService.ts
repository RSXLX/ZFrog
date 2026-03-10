import { Response, Request, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    const statusCode = res.statusCode;
    
    // Log slow requests (> 100ms)
    if (duration > 100) {
      logger.warn(`Slow API: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    }
    
    // Log all API calls
    logger.info(`${req.method} ${req.path} - ${statusCode} - ${duration.toFixed(2)}ms`);
  });
  
  next();
};

// Database query performance monitoring
export const monitorQuery = async <T>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    
    // Log slow queries (> 10ms)
    if (duration > 10) {
      logger.warn(`Slow query: ${queryName} - ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Query failed: ${queryName}`, error);
    throw error;
  }
};

// Cache performance monitoring
export const monitorCache = <T>(operation: string, cacheFn: () => T): T => {
  const start = performance.now();
  const result = cacheFn();
  const duration = performance.now() - start;
  
  // Log slow cache operations (> 1ms)
  if (duration > 1) {
    logger.warn(`Slow cache operation: ${operation} - ${duration.toFixed(2)}ms`);
  }
  
  return result;
};
