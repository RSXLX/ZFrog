import { randomBytes } from 'crypto';
import { isAddress } from 'ethers';
import { config } from '../../config';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';

const DEFAULT_NONCE_TTL_SECONDS = 10 * 60;

export const normalizeWalletAddress = (walletAddress: string): string => {
  const normalized = walletAddress?.trim().toLowerCase();
  if (!normalized || !isAddress(normalized)) {
    throw new AppError(400, 'Invalid walletAddress', 'INVALID_INPUT');
  }
  return normalized;
};

const buildSignMessage = (walletAddress: string, nonce: string, issuedAtIso: string): string => {
  return [
    'Sign this message to login to ZFrog',
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAtIso}`,
  ].join('\n');
};

const nonceTtlSeconds = (): number => {
  const parsed = Number(config.AUTH_NONCE_TTL_SECONDS || DEFAULT_NONCE_TTL_SECONDS);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_NONCE_TTL_SECONDS;
  }
  return parsed;
};

export class NonceService {
  async issueNonce(walletAddress: string): Promise<{ nonce: string; message: string; expiresAt: Date }> {
    const normalizedAddress = normalizeWalletAddress(walletAddress);

    await prisma.authNonce.updateMany({
      where: {
        walletAddress: normalizedAddress,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    const nonce = randomBytes(16).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + nonceTtlSeconds() * 1000);
    const message = buildSignMessage(normalizedAddress, nonce, issuedAt.toISOString());

    await prisma.authNonce.create({
      data: {
        walletAddress: normalizedAddress,
        nonce,
        message,
        expiresAt,
      },
    });

    return { nonce, message, expiresAt };
  }

  async consumeNonceWithSignature(walletAddress: string, signatureVerifier: (message: string) => boolean): Promise<void> {
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const now = new Date();

    const activeNonces = await prisma.authNonce.findMany({
      where: {
        walletAddress: normalizedAddress,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const matched = activeNonces.find((nonce) => signatureVerifier(nonce.message));
    if (!matched) {
      throw new AppError(401, 'Invalid signature or nonce expired', 'INVALID_SIGNATURE');
    }

    await prisma.authNonce.update({
      where: { id: matched.id },
      data: { usedAt: new Date() },
    });
  }
}

export const nonceService = new NonceService();
