/**
 * Advanced Logger
 * Production-ready logging with multiple transports and levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFilePath?: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  enableRemote: boolean;
  remoteEndpoint?: string;
  enableBuffering: boolean;
  bufferSize: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private fileStream: any = null;
  private currentFileSize: number = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: 'info',
      enableConsole: true,
      enableFile: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableRemote: false,
      enableBuffering: true,
      bufferSize: 100,
      ...config,
    };

    if (this.config.enableFile && this.config.logFilePath) {
      this.initFileStream();
    }
  }

  /**
   * Initialize file stream for logging
   */
  private initFileStream(): void {
    // In Electron main process, use fs
    // In renderer, this would need to go through IPC
    if (typeof window !== 'undefined' && window.electronAPI) {
      // We're in renderer process
      // File logging would need to be handled by main process
      this.warn('File logging in renderer process not directly supported. Use IPC to main process.');
      this.config.enableFile = false;
      return;
    }

    // In main process or Node environment
    try {
      const fs = require('fs');
      const path = require('path');

      const logDir = path.dirname(this.config.logFilePath!);
      
      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Check current file size
      if (fs.existsSync(this.config.logFilePath!)) {
        const stats = fs.statSync(this.config.logFilePath!);
        this.currentFileSize = stats.size;

        // Rotate if too large
        if (this.currentFileSize >= this.config.maxFileSize) {
          this.rotateLogFile();
        }
      }

      // Create write stream
      this.fileStream = fs.createWriteStream(this.config.logFilePath!, {
        flags: 'a',
        encoding: 'utf8',
      });

      this.info('File logging initialized', {
        logFile: this.config.logFilePath,
        maxSize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
      });

    } catch (error) {
      this.error('Failed to initialize file logging', { error });
      this.config.enableFile = false;
    }
  }

  /**
   * Rotate log file when it gets too large
   */
  private rotateLogFile(): void {
    try {
      const fs = require('fs');
      const path = require('path');

      const basePath = this.config.logFilePath!;
      const ext = path.extname(basePath);
      const baseName = basePath.slice(0, -ext.length);

      // Delete oldest file if at max
      const oldestFile = `${baseName}.${this.config.maxFiles}${ext}`;
      if (fs.existsSync(oldestFile)) {
        fs.unlinkSync(oldestFile);
      }

      // Shift existing files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = i === 1 ? basePath : `${baseName}.${i}${ext}`;
        const newFile = `${baseName}.${i + 1}${ext}`;
        
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      this.currentFileSize = 0;
      this.info('Log file rotated');

    } catch (error) {
      this.error('Failed to rotate log file', { error });
    }
  }

  /**
   * Send log entry to remote server
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Silently fail for remote logging
      console.warn('[Logger] Failed to send log to remote:', error);
    }
  }

  /**
   * Format log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    
    let output = `[${timestamp}] ${level}: ${message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`;
    }
    
    return output;
  }

  /**
   * Process and output log entry
   */
  private processEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    // Check level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatEntry(entry);
      
      switch (level) {
        case 'debug':
          console.debug(formatted);
          break;
        case 'info':
          console.info(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
        case 'fatal':
          console.error(formatted);
          break;
      }
    }

    // File output
    if (this.config.enableFile && this.fileStream) {
      const formatted = this.formatEntry(entry);
      this.fileStream.write(formatted + '\n');
      this.currentFileSize += formatted.length + 1;

      // Check for rotation
      if (this.currentFileSize >= this.config.maxFileSize) {
        this.rotateLogFile();
      }
    }

    // Remote output (async)
    this.sendToRemote(entry).catch(() => {
      // Silently fail for remote logging
    });

    // Buffer if enabled
    if (this.config.enableBuffering) {
      this.buffer.push(entry);
      
      // Flush if buffer is full
      if (this.buffer.length >= this.config.bufferSize) {
        this.flushBuffer();
      }
    }
  }

  /**
   * Flush buffered logs
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0) {
      return;
    }

    // In production, this might batch send to a server
    // For now, just log that we're flushing
    console.log(`[Logger] Flushing ${this.buffer.length} buffered logs`);

    // Clear buffer
    this.buffer = [];
  }

  // Public logging methods
  debug(message: string, context?: Record<string, unknown>): void {
    this.processEntry('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.processEntry('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.processEntry('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.processEntry('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.processEntry('fatal', message, context, error);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };

    // Handle file logging enable/disable
    if (config.enableFile && !this.fileStream) {
      this.initFileStream();
    } else if (config.enableFile === false && this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Stop update checker
    this.stop();

    // Flush buffer
    this.flushBuffer();

    // Close file stream
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }

    // Clear callbacks
    this.onUpdateAvailableCallbacks = [];
    this.onUpdateDownloadedCallbacks = [];
    this.onUpdateInstalledCallbacks = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types and class
export { Logger, LoggerConfig, LogLevel, LogEntry };

// Default export
export default logger;
