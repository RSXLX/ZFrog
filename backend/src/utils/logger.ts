import winston from 'winston';
import { config } from '../config';

// 结构化日志格式
const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// 控制台友好格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // 处理 BigInt 序列化问题
        const safeStringify = (obj: any): string => {
            return JSON.stringify(obj, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            );
        };
        
        const metaStr = Object.keys(meta).length 
            ? ` ${safeStringify(meta)}` 
            : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

// 传输配置
const transports: winston.transport[] = [
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// 生产环境添加文件传输
if (config.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: structuredFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: structuredFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        })
    );
}

export const logger = winston.createLogger({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: structuredFormat,
    transports,
    // 捕获未处理的异常和 Promise rejection
    exceptionHandlers: config.NODE_ENV === 'production' 
        ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
        : undefined,
});

// 便捷方法：带上下文的日志
export const logWithContext = (context: string) => ({
    info: (message: string, meta?: object) => logger.info(message, { context, ...meta }),
    warn: (message: string, meta?: object) => logger.warn(message, { context, ...meta }),
    error: (message: string, meta?: object) => logger.error(message, { context, ...meta }),
    debug: (message: string, meta?: object) => logger.debug(message, { context, ...meta }),
});
