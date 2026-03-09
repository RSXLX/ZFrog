/**
 * Global Error Handler
 * Centralized error handling and reporting
 */

import { logger } from './logger';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  system: {
    platform: string;
    version: string;
    electronVersion?: string;
    chromeVersion?: string;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize: number = 100;
  private isProcessing: boolean = false;
  private errorListeners: ((report: ErrorReport) => void)[] = [];
  private context: ErrorContext = {};

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error: Error) => {
        this.handleError(error, { action: 'uncaughtException' });
      });

      process.on('unhandledRejection', (reason: any) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.handleError(error, { action: 'unhandledRejection' });
      });
    }

    // Handle window errors (if in browser/renderer)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event: ErrorEvent) => {
        this.handleError(event.error || new Error(event.message), {
          action: 'window.onerror',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.handleError(error, { action: 'window.unhandledrejection' });
      });
    }
  }

  /**
   * Set global context for all errors
   */
  setContext(context: ErrorContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Main error handling method
   */
  handleError(error: Error, context: ErrorContext = {}): void {
    const report = this.createErrorReport(error, context);
    
    // Add to queue
    this.errorQueue.push(report);
    
    // Trim queue if too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Log immediately
    this.logError(report);

    // Notify listeners
    this.notifyListeners(report);

    // Process queue
    this.processQueue();
  }

  /**
   * Create error report
   */
  private createErrorReport(error: Error, context: ErrorContext): ErrorReport {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...this.context,
        ...context,
      },
      system: this.getSystemInfo(),
    };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    return {
      platform: typeof process !== 'undefined' ? process.platform : 'browser',
      version: typeof process !== 'undefined' ? process.version : 'unknown',
      electronVersion: typeof process !== 'undefined' ? (process.versions as any).electron : undefined,
      chromeVersion: typeof process !== 'undefined' ? (process.versions as any).chrome : undefined,
    };
  }

  /**
   * Log error to console/file
   */
  private logError(report: ErrorReport): void {
    const { error, context, system } = report;
    
    logger.error(`[${error.name}] ${error.message}`, {
      errorId: report.id,
      context,
      system,
      stack: error.stack,
    });
  }

  /**
   * Notify error listeners
   */
  private notifyListeners(report: ErrorReport): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Process error queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process errors in batch
      const batch = this.errorQueue.splice(0, 10);
      
      // Send to remote server if configured
      await this.sendToRemote(batch);
      
    } catch (error) {
      console.error('Error processing error queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more errors
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Send errors to remote server
   */
  private async sendToRemote(batch: ErrorReport[]): Promise<void> {
    // In production, implement actual remote error reporting
    // For now, just log that we would send them
    if (batch.length > 0) {
      logger.debug(`Would send ${batch.length} errors to remote server`);
    }
  }

  /**
   * Add error listener
   */
  addListener(listener: (report: ErrorReport) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index !== -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get error queue
   */
  getQueue(): ErrorReport[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error queue
   */
  clearQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  getStats(): {
    queueSize: number;
    isProcessing: boolean;
    listenerCount: number;
  } {
    return {
      queueSize: this.errorQueue.length,
      isProcessing: this.isProcessing,
      listenerCount: this.errorListeners.length,
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export types
export type { ErrorReport, ErrorContext, LogLevel };

// Default export
export default errorHandler;
