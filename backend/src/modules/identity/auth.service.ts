import { verifyMessage } from 'ethers';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { generateToken } from '../../middlewares/auth.middleware';
import { nonceService, normalizeWalletAddress } from './nonce.service';
import { NoncePayload, WalletLoginInput, WalletLoginPayload } from './types';
import { logger } from '../../utils/logger';

export class AuthService {
  async issueNonce(walletAddress: string): Promise<NoncePayload> {
    const { nonce, message, expiresAt } = await nonceService.issueNonce(walletAddress);
    return {
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async loginWithWallet(input: WalletLoginInput): Promise<WalletLoginPayload> {
    if (!input.signature?.trim()) {
      throw new AppError(400, 'signature is required', 'INVALID_INPUT');
    }

    const walletAddress = normalizeWalletAddress(input.walletAddress);
    const signature = input.signature.trim();

    await nonceService.consumeNonceWithSignature(walletAddress, (message: string) => {
      try {
        const recovered = verifyMessage(message, signature).toLowerCase();
        return recovered === walletAddress;
      } catch {
        return false;
      }
    });

    const frog = await prisma.frog.findUnique({
      where: { ownerAddress: walletAddress },
      select: { id: true, tokenId: true },
    });

    const token = generateToken(walletAddress, input.chainId, frog?.tokenId ?? null);

    try {
      await prisma.domainEvent.create({
        data: {
          frogId: frog?.id,
          aggregateType: 'Identity',
          aggregateId: walletAddress,
          eventType: 'WalletAuthenticated',
          payload: {
            walletAddress,
            chainId: input.chainId,
            frogTokenId: frog?.tokenId ?? null,
          },
          source: 'auth.service',
        },
      });
    } catch (eventError) {
      logger.warn('[AuthService] Failed to write WalletAuthenticated domain event', {
        walletAddress,
        eventError,
      });
    }

    return {
      token,
      walletAddress,
      frogTokenId: frog?.tokenId ?? null,
      hasFrog: Boolean(frog),
    };
  }
}

export const authService = new AuthService();
