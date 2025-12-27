// backend/src/middlewares/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 自定义应用错误类
 * 用于抛出带有 HTTP 状态码的业务错误
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 标记为可操作错误（非系统错误）

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常用错误快捷创建
 */
export const BadRequestError = (message: string) => new AppError(400, message);
export const UnauthorizedError = (message: string) => new AppError(401, message);
export const ForbiddenError = (message: string) => new AppError(403, message);
export const NotFoundError = (message: string) => new AppError(404, message);
export const ConflictError = (message: string) => new AppError(409, message);
export const InternalError = (message: string) => new AppError(500, message);

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误并返回统一格式的 JSON 响应
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 记录错误日志
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // 构建错误响应
  const response: ErrorResponse = {
    success: false,
    error: 'Internal server error',
  };

  // 处理 AppError（业务错误）
  if (err instanceof AppError) {
    response.error = err.message;
    res.status(err.statusCode).json(response);
    return;
  }

  // 处理 Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    switch (prismaError.code) {
      case 'P2002': // 唯一约束冲突
        response.error = 'Resource already exists';
        response.code = 'CONFLICT';
        res.status(409).json(response);
        return;
      case 'P2025': // 记录未找到
        response.error = 'Resource not found';
        response.code = 'NOT_FOUND';
        res.status(404).json(response);
        return;
      case 'P2003': // 外键约束失败
        response.error = 'Invalid reference';
        response.code = 'BAD_REQUEST';
        res.status(400).json(response);
        return;
    }
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    response.error = 'Invalid JSON format';
    response.code = 'BAD_REQUEST';
    res.status(400).json(response);
    return;
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    response.error = err.message;
    response.code = 'VALIDATION_ERROR';
    res.status(400).json(response);
    return;
  }

  // 默认：内部服务器错误
  response.code = 'INTERNAL_ERROR';
  
  // 开发环境下返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    response.details = err.message;
  }

  res.status(500).json(response);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}

/**
 * 异步路由包装器
 * 用于自动捕获 async 路由中的错误
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
