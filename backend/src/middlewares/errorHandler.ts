// backend/src/middlewares/errorHandler.ts

import { NextFunction, Request, Response } from 'express';
import { buildErrorResponse } from '../api/response';
import { logger } from '../utils/logger';

const DEFAULT_ERROR_CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_ERROR',
};

/**
 * 自定义应用错误类
 * 用于抛出带有 HTTP 状态码的业务错误
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 标记为可操作错误（非系统错误）
    this.code = code || DEFAULT_ERROR_CODE_BY_STATUS[statusCode] || 'INTERNAL_ERROR';
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常用错误快捷创建
 */
export const BadRequestError = (message: string, details?: unknown) =>
  new AppError(400, message, 'BAD_REQUEST', details);
export const UnauthorizedError = (message: string, details?: unknown) =>
  new AppError(401, message, 'UNAUTHORIZED', details);
export const ForbiddenError = (message: string, details?: unknown) =>
  new AppError(403, message, 'FORBIDDEN', details);
export const NotFoundError = (message: string, details?: unknown) =>
  new AppError(404, message, 'NOT_FOUND', details);
export const ConflictError = (message: string, details?: unknown) =>
  new AppError(409, message, 'CONFLICT', details);
export const InternalError = (message: string, details?: unknown) =>
  new AppError(500, message, 'INTERNAL_ERROR', details);

/**
 * 统一错误响应格式（legacy）
 */
interface LegacyErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

const isStructuredApiRequest = (req: Request): boolean =>
  req.originalUrl.startsWith('/api/v1') ||
  req.path.startsWith('/api/v1') ||
  req.originalUrl.startsWith('/api/v2') ||
  req.path.startsWith('/api/v2') ||
  req.originalUrl.startsWith('/api/v3') ||
  req.path.startsWith('/api/v3');

const stringifyLegacyDetails = (details: unknown): string | undefined => {
  if (typeof details === 'string') {
    return details;
  }
  if (details === undefined || details === null) {
    return undefined;
  }
  try {
    return JSON.stringify(details);
  } catch {
    return undefined;
  }
};

const sendErrorResponse = (
  req: Request,
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void => {
  if (isStructuredApiRequest(req)) {
    res
      .status(statusCode)
      .json(
        buildErrorResponse(req, {
          code,
          message,
          ...(details !== undefined ? { details } : {}),
        })
      );
    return;
  }

  const response: LegacyErrorResponse = {
    success: false,
    error: message,
    code,
  };

  const legacyDetails = stringifyLegacyDetails(details);
  if (legacyDetails) {
    response.details = legacyDetails;
  }
  res.status(statusCode).json(response);
};

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
    requestId: req.requestId,
    stack: err.stack,
  });

  // 处理 AppError（业务错误）
  if (err instanceof AppError) {
    sendErrorResponse(req, res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 处理 Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    switch (prismaError.code) {
      case 'P2002': // 唯一约束冲突
        sendErrorResponse(req, res, 409, 'CONFLICT', 'Resource already exists');
        return;
      case 'P2025': // 记录未找到
        sendErrorResponse(req, res, 404, 'NOT_FOUND', 'Resource not found');
        return;
      case 'P2003': // 外键约束失败
        sendErrorResponse(req, res, 400, 'BAD_REQUEST', 'Invalid reference');
        return;
      default:
        break;
    }
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    sendErrorResponse(req, res, 400, 'BAD_REQUEST', 'Invalid JSON format');
    return;
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    sendErrorResponse(req, res, 400, 'VALIDATION_ERROR', err.message);
    return;
  }

  // 默认：内部服务器错误
  const details = process.env.NODE_ENV === 'development' ? err.message : undefined;
  sendErrorResponse(req, res, 500, 'INTERNAL_ERROR', 'Internal server error', details);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendErrorResponse(req, res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
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
