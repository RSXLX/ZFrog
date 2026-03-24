import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { respondError } from '../api/response';
import { V2SocialErrorCodes } from '../types/api';

export interface V2SocialRolloutConfig {
  enabled: boolean;
  rolloutPercent: number;
  forceFallback: boolean;
  salt: string;
}

export type V2SocialRolloutReason =
  | 'allowed'
  | 'rollout_disabled'
  | 'force_fallback'
  | 'rollout_blocked'
  | 'wallet_missing';

export interface V2SocialRolloutEvaluation {
  config: V2SocialRolloutConfig;
  walletAddress?: string;
  walletBucket?: number;
  allowed: boolean;
  reason: V2SocialRolloutReason;
}

export interface V2SocialRolloutStatus {
  enabled: boolean;
  rolloutPercent: number;
  forceFallback: boolean;
  reason: V2SocialRolloutReason;
  walletEligible?: boolean;
  walletBucket?: number;
}

const DEFAULT_ROLLOUT_PERCENT = 100;
const DEFAULT_ROLLOUT_ENABLED = true;
const DEFAULT_ROLLOUT_SALT = 'zfrog-v2-social-rollout';

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const parseRolloutPercent = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.floor(parsed);
  if (normalized < 0) {
    return 0;
  }
  if (normalized > 100) {
    return 100;
  }
  return normalized;
};

const normalizeWalletAddress = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith('0x') || normalized.length !== 42) {
    return undefined;
  }
  return normalized;
};

const calculateWalletBucket = (walletAddress: string, salt: string): number => {
  const hash = createHash('sha256').update(`${salt}:${walletAddress}`).digest('hex');
  const numeric = Number.parseInt(hash.slice(0, 8), 16);
  return numeric % 100;
};

export const readV2SocialRolloutConfig = (): V2SocialRolloutConfig => ({
  enabled: parseBoolean(process.env.V2_SOCIAL_ROLLOUT_ENABLED, DEFAULT_ROLLOUT_ENABLED),
  rolloutPercent: parseRolloutPercent(
    process.env.V2_SOCIAL_ROLLOUT_PERCENT,
    DEFAULT_ROLLOUT_PERCENT
  ),
  forceFallback: parseBoolean(process.env.V2_SOCIAL_FORCE_FALLBACK, false),
  salt: (process.env.V2_SOCIAL_ROLLOUT_SALT || DEFAULT_ROLLOUT_SALT).trim() || DEFAULT_ROLLOUT_SALT,
});

export const getWalletAddressFromRequest = (req: Request): string | undefined => {
  const fromUser = normalizeWalletAddress(req.user?.walletAddress || req.user?.address);
  if (fromUser) {
    return fromUser;
  }

  const headerValue = req.headers['x-wallet-address'];
  const fromHeader = normalizeWalletAddress(Array.isArray(headerValue) ? headerValue[0] : headerValue);
  if (fromHeader) {
    return fromHeader;
  }

  const fromQuery = normalizeWalletAddress(req.query?.address);
  return fromQuery;
};

export const evaluateV2SocialRollout = (
  walletAddress?: string,
  inputConfig?: V2SocialRolloutConfig
): V2SocialRolloutEvaluation => {
  const config = inputConfig || readV2SocialRolloutConfig();
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  if (!config.enabled) {
    return {
      config,
      allowed: false,
      reason: 'rollout_disabled',
      ...(normalizedWallet ? { walletAddress: normalizedWallet } : {}),
    };
  }

  if (config.forceFallback) {
    return {
      config,
      allowed: false,
      reason: 'force_fallback',
      ...(normalizedWallet ? { walletAddress: normalizedWallet } : {}),
    };
  }

  if (config.rolloutPercent >= 100) {
    const walletBucket = normalizedWallet
      ? calculateWalletBucket(normalizedWallet, config.salt)
      : undefined;
    return {
      config,
      allowed: true,
      reason: 'allowed',
      ...(normalizedWallet ? { walletAddress: normalizedWallet } : {}),
      ...(walletBucket !== undefined ? { walletBucket } : {}),
    };
  }

  if (!normalizedWallet) {
    return {
      config,
      allowed: false,
      reason: 'wallet_missing',
    };
  }

  const walletBucket = calculateWalletBucket(normalizedWallet, config.salt);
  const allowed = walletBucket < config.rolloutPercent;

  return {
    config,
    walletAddress: normalizedWallet,
    walletBucket,
    allowed,
    reason: allowed ? 'allowed' : 'rollout_blocked',
  };
};

export const getV2SocialRolloutStatus = (req: Request): V2SocialRolloutStatus => {
  const evaluation = evaluateV2SocialRollout(getWalletAddressFromRequest(req));
  return {
    enabled: evaluation.config.enabled,
    rolloutPercent: evaluation.config.rolloutPercent,
    forceFallback: evaluation.config.forceFallback,
    reason: evaluation.reason,
    ...(evaluation.walletBucket !== undefined ? { walletBucket: evaluation.walletBucket } : {}),
    ...(evaluation.walletAddress ? { walletEligible: evaluation.allowed } : {}),
  };
};

const buildRolloutBlockedMessage = (reason: V2SocialRolloutReason): string => {
  if (reason === 'force_fallback') {
    return 'V2 social fallback is active';
  }
  if (reason === 'rollout_disabled') {
    return 'V2 social rollout is disabled';
  }
  if (reason === 'wallet_missing') {
    return 'Wallet address is required for V2 social rollout';
  }
  return 'V2 social is not enabled for this wallet yet';
};

export const v2SocialRolloutGuard = (req: Request, res: Response, next: NextFunction): void => {
  const evaluation = evaluateV2SocialRollout(getWalletAddressFromRequest(req));
  if (evaluation.allowed) {
    next();
    return;
  }

  respondError(
    req,
    res,
    503,
    V2SocialErrorCodes.V2_SOCIAL_ROLLOUT_BLOCKED,
    buildRolloutBlockedMessage(evaluation.reason),
    {
      reason: evaluation.reason,
      rolloutPercent: evaluation.config.rolloutPercent,
      forceFallback: evaluation.config.forceFallback,
      ...(evaluation.walletBucket !== undefined ? { walletBucket: evaluation.walletBucket } : {}),
    }
  );
};

