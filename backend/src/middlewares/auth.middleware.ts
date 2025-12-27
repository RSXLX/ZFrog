// backend/src/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// 扩展 Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
      };
    }
  }
}

/**
 * 简单的认证中间件
 * 从请求头或查询参数中获取用户地址
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 从 Authorization header 获取地址
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const address = authHeader.substring(7);
      if (isValidAddress(address)) {
        req.user = { address };
        return next();
      }
    }

    // 从查询参数获取地址（用于测试）
    const addressFromQuery = req.query.address as string;
    if (addressFromQuery && isValidAddress(addressFromQuery)) {
      req.user = { address: addressFromQuery };
      return next();
    }

    // 从请求体获取地址（用于测试）
    const addressFromBody = req.body.address;
    if (addressFromBody && isValidAddress(addressFromBody)) {
      req.user = { address: addressFromBody };
      return next();
    }

    // 如果都没有找到有效的地址，返回401
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid wallet address required'
    });
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * 验证以太坊地址格式
 */
function isValidAddress(address: string): boolean {
  // 简单的地址格式验证
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 可选的认证中间件（不强制要求认证）
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const address = authHeader.substring(7);
      if (isValidAddress(address)) {
        req.user = { address };
      }
    }

    // 继续处理，无论是否有认证信息
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // 即使出错也继续处理
  }
}