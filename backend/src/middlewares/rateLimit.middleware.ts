import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { buildErrorResponse } from '../api/response';
import { ApiErrorCode } from '../types/api';

interface V2WriteRateLimiterOptions {
  windowMs: number;
  max: number;
  code: ApiErrorCode;
  message: string;
}

const getHeaderWallet = (req: Request): string | null => {
  const walletHeader = Array.isArray(req.headers['x-wallet-address'])
    ? req.headers['x-wallet-address'][0]
    : req.headers['x-wallet-address'];

  if (typeof walletHeader === 'string' && walletHeader.trim()) {
    return walletHeader.trim().toLowerCase();
  }
  return null;
};

const getAuthWallet = (req: Request): string | null => {
  const authWallet = req.user?.walletAddress || req.user?.address;
  if (typeof authWallet === 'string' && authWallet.trim()) {
    return authWallet.trim().toLowerCase();
  }
  return null;
};

const getClientIdentity = (req: Request): string => {
  const wallet = getAuthWallet(req) || getHeaderWallet(req);
  if (wallet) {
    return `wallet:${wallet}`;
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
};

export const createV2WriteRateLimiter = (options: V2WriteRateLimiterOptions) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const routeScope = `${req.baseUrl}${req.path}`;
      return `${getClientIdentity(req)}|${routeScope}`;
    },
    handler: (req, res) => {
      res.status(429).json(
        buildErrorResponse(req, {
          code: options.code,
          message: options.message,
          details: {
            windowMs: options.windowMs,
            max: options.max,
          },
        })
      );
    },
  });
