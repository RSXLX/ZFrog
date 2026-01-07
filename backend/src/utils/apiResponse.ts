// backend/src/utils/apiResponse.ts
/**
 * 统一的 API 响应工具类
 * 提供一致的响应格式和错误处理
 */

import { Response } from 'express';

/**
 * 标准 API 响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
    timestamp?: number;
  };
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    timestamp: number;
  };
}

/**
 * 错误码定义
 */
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,
  
  // 青蛙相关 (2xxx)
  FROG_NOT_FOUND = 2001,
  FROG_ALREADY_TRAVELING = 2002,
  FROG_NOT_OWNED = 2003,
  
  // 旅行相关 (3xxx)
  TRAVEL_NOT_FOUND = 3001,
  TRAVEL_ALREADY_COMPLETED = 3002,
  TRAVEL_INVALID_DURATION = 3003,
  TRAVEL_INVALID_CHAIN = 3004,
  
  // 好友相关 (4xxx)
  FRIENDSHIP_NOT_FOUND = 4001,
  FRIENDSHIP_ALREADY_EXISTS = 4002,
  NOT_FRIENDS = 4003,
}

/**
 * 错误信息映射
 */
const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.VALIDATION_ERROR]: '参数验证失败',
  [ErrorCode.NOT_FOUND]: '资源未找到',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  
  [ErrorCode.FROG_NOT_FOUND]: '青蛙不存在',
  [ErrorCode.FROG_ALREADY_TRAVELING]: '青蛙正在旅行中',
  [ErrorCode.FROG_NOT_OWNED]: '您不是这只青蛙的主人',
  
  [ErrorCode.TRAVEL_NOT_FOUND]: '旅行记录不存在',
  [ErrorCode.TRAVEL_ALREADY_COMPLETED]: '旅行已完成',
  [ErrorCode.TRAVEL_INVALID_DURATION]: '无效的旅行时长',
  [ErrorCode.TRAVEL_INVALID_CHAIN]: '不支持的目标链',
  
  [ErrorCode.FRIENDSHIP_NOT_FOUND]: '好友关系不存在',
  [ErrorCode.FRIENDSHIP_ALREADY_EXISTS]: '好友关系已存在',
  [ErrorCode.NOT_FRIENDS]: '你们还不是好友',
};

/**
 * API 响应工具类
 */
export class ApiResponseHelper {
  /**
   * 成功响应
   */
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: Date.now(),
      },
    };
    return res.status(statusCode).json(response);
  }
  
  /**
   * 分页成功响应
   */
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ): Response {
    const hasMore = page * pageSize < total;
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      meta: {
        total,
        page,
        pageSize,
        hasMore,
        timestamp: Date.now(),
      },
    };
    return res.status(200).json(response);
  }
  
  /**
   * 错误响应
   */
  static error(
    res: Response,
    code: ErrorCode,
    customMessage?: string,
    statusCode = 400
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: customMessage || ErrorMessages[code] || '未知错误',
      meta: {
        timestamp: Date.now(),
      },
    };
    return res.status(statusCode).json(response);
  }
  
  /**
   * 未找到响应
   */
  static notFound(res: Response, message = '资源未找到'): Response {
    return ApiResponseHelper.error(res, ErrorCode.NOT_FOUND, message, 404);
  }
  
  /**
   * 验证失败响应
   */
  static validationError(res: Response, message: string): Response {
    return ApiResponseHelper.error(res, ErrorCode.VALIDATION_ERROR, message, 400);
  }
  
  /**
   * 服务器错误响应
   */
  static serverError(res: Response, error?: Error): Response {
    console.error('Server error:', error);
    const response: ApiResponse = {
      success: false,
      error: '服务器内部错误',
      meta: {
        timestamp: Date.now(),
      },
    };
    return res.status(500).json(response);
  }
  
  /**
   * 创建成功响应
   */
  static created<T>(res: Response, data: T, message = '创建成功'): Response {
    return ApiResponseHelper.success(res, data, message, 201);
  }
  
  /**
   * 删除成功响应
   */
  static deleted(res: Response, message = '删除成功'): Response {
    return ApiResponseHelper.success(res, null, message, 200);
  }
}

// 导出简写
export const ApiRes = ApiResponseHelper;
export { ErrorMessages };
