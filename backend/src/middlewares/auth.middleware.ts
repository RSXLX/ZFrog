// backend/src/middlewares/auth.middleware.ts
/**
 * JWT 认证中间件
 * 用于保护需要授权的 API 端点
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

// JWT Token 载荷类型
export interface JwtPayload {
  address: string;         // 钱包地址
  chainId?: number;        // 链 ID
  iat?: number;            // 签发时间
  exp?: number;            // 过期时间
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'zetafrog-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成 JWT Token
 */
export function generateToken(address: string, chainId?: number): string {
  const payload = {
    address: address.toLowerCase(),
    chainId,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * 认证中间件 - 必须登录
 * 验证请求头中的 Bearer Token
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 兼容旧的简单认证方式 (仅开发环境或过渡期)
      if (process.env.NODE_ENV !== 'production' && req.query.address) {
        req.user = { address: (req.query.address as string).toLowerCase() };
        return next();
      }
      if (process.env.NODE_ENV !== 'production') {
        const rawHeaderAddress = req.headers['x-wallet-address'] ?? req.headers['x-admin-address'];
        const headerAddress = Array.isArray(rawHeaderAddress) ? rawHeaderAddress[0] : rawHeaderAddress;
        if (typeof headerAddress === 'string' && headerAddress.startsWith('0x') && headerAddress.length === 42) {
          req.user = { address: headerAddress.toLowerCase() };
          return next();
        }
      }
      throw new AppError(401, '未提供认证令牌', 'UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    
    // 兼容旧的直接传地址的方式 (仅非生产环境)
    if (process.env.NODE_ENV !== 'production' && token.startsWith('0x') && token.length === 42) {
       req.user = { address: token.toLowerCase() };
       return next();
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token 已过期，请重新登录', 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, '无效的 Token', 'INVALID_TOKEN'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Auth middleware error:', {
        requestId: req.requestId,
        error,
      });
      next(new AppError(401, '认证失败', 'AUTH_FAILED'));
    }
  }
}

let hasWarnedMissingAdminAllowlist = false;

/**
 * 管理员中间件
 * 需要在 authRequired 之后使用
 */
export function adminRequired(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.address) {
    return next(new AppError(401, '需要登录', 'UNAUTHORIZED'));
  }

  const allowlist = config.ADMIN_ADDRESSES || [];
  const address = req.user.address.toLowerCase();

  if (allowlist.length === 0) {
    if (config.NODE_ENV !== 'production') {
      if (!hasWarnedMissingAdminAllowlist) {
        logger.warn('[Auth] ADMIN_ADDRESSES 未配置，非生产环境允许访问管理员接口');
        hasWarnedMissingAdminAllowlist = true;
      }
      return next();
    }
    return next(new AppError(403, '管理员白名单未配置', 'ADMIN_ALLOWLIST_MISSING'));
  }

  if (!allowlist.includes(address)) {
    return next(new AppError(403, '需要管理员权限', 'FORBIDDEN'));
  }

  return next();
}

/**
 * 可选认证中间件
 * 如果有 Token 则验证，没有也可以继续
 */
export function authOptional(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // 兼容旧方式（仅非生产环境）
      if (
        process.env.NODE_ENV !== 'production' &&
        token.startsWith('0x') &&
        token.length === 42
      ) {
        req.user = { address: token.toLowerCase() };
      } else {
        req.user = verifyToken(token);
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不阻断请求
    logger.debug('Optional auth failed, continuing without auth');
    next();
  }
}

/**
 * 验证钱包所有权中间件
 * 确保请求者是资源的所有者
 */
export function ownershipRequired(addressParam: string = 'address') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, '需要登录', 'UNAUTHORIZED'));
    }
    
    const targetAddress = (
      req.params[addressParam] || 
      req.body[addressParam] || 
      req.query[addressParam]
    ) as string;
    
    if (!targetAddress) {
      return next(new AppError(400, '缺少地址参数', 'INVALID_INPUT'));
    }
    
    if (req.user.address.toLowerCase() !== targetAddress.toLowerCase()) {
      return next(new AppError(403, '您没有权限访问此资源', 'FORBIDDEN'));
    }
    
    next();
  };
}

/**
 * 验证青蛙所有权中间件
 * 用于保护青蛙相关的操作
 */
export function frogOwnershipRequired(frogIdParam: string = 'frogId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError(401, '需要登录', 'UNAUTHORIZED'));
      }
      
      const frogId = parseInt(
        req.params[frogIdParam] || 
        req.body[frogIdParam] || 
        req.query[frogIdParam] as string
      );
      
      if (isNaN(frogId)) {
        return next(new AppError(400, '无效的青蛙 ID', 'INVALID_INPUT'));
      }
      
      // 动态导入 prisma 避免循环依赖
      const { prisma } = await import('../database');
      
      const frog = await prisma.frog.findUnique({
        where: { tokenId: frogId },
        select: { ownerAddress: true },
      });
      
      if (!frog) {
        return next(new AppError(404, '青蛙不存在', 'NOT_FOUND'));
      }
      
      if (frog.ownerAddress.toLowerCase() !== req.user.address.toLowerCase()) {
        return next(new AppError(403, '您不是这只青蛙的主人', 'FORBIDDEN'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// 导出简写
export const auth = {
  required: authRequired,
  optional: authOptional,
  adminRequired,
  ownershipRequired,
  frogOwnershipRequired,
};

// 兼容旧导出
export const authMiddleware = authRequired;
export const optionalAuthMiddleware = authOptional;
