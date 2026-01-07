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
      throw new AppError(401, '未提供认证令牌');
    }
    
    const token = authHeader.substring(7);
    
    // 兼容旧的直接传地址的方式 (如果 token 看起来像地址)
    if (token.startsWith('0x') && token.length === 42) {
       req.user = { address: token.toLowerCase() };
       return next();
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token 已过期，请重新登录'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, '无效的 Token'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Auth middleware error:', error);
      next(new AppError(401, '认证失败'));
    }
  }
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
      
      // 兼容旧方式
      if (token.startsWith('0x') && token.length === 42) {
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
      return next(new AppError(401, '需要登录'));
    }
    
    const targetAddress = (
      req.params[addressParam] || 
      req.body[addressParam] || 
      req.query[addressParam]
    ) as string;
    
    if (!targetAddress) {
      return next(new AppError(400, '缺少地址参数'));
    }
    
    if (req.user.address.toLowerCase() !== targetAddress.toLowerCase()) {
      return next(new AppError(403, '您没有权限访问此资源'));
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
        return next(new AppError(401, '需要登录'));
      }
      
      const frogId = parseInt(
        req.params[frogIdParam] || 
        req.body[frogIdParam] || 
        req.query[frogIdParam] as string
      );
      
      if (isNaN(frogId)) {
        return next(new AppError(400, '无效的青蛙 ID'));
      }
      
      // 动态导入 prisma 避免循环依赖
      const { prisma } = await import('../database');
      
      const frog = await prisma.frog.findUnique({
        where: { tokenId: frogId },
        select: { ownerAddress: true },
      });
      
      if (!frog) {
        return next(new AppError(404, '青蛙不存在'));
      }
      
      if (frog.ownerAddress.toLowerCase() !== req.user.address.toLowerCase()) {
        return next(new AppError(403, '您不是这只青蛙的主人'));
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
  ownershipRequired,
  frogOwnershipRequired,
};

// 兼容旧导出
export const authMiddleware = authRequired;
export const optionalAuthMiddleware = authOptional;