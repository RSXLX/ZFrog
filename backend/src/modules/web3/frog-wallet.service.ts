import { createPublicClient, encodePacked, getAddress, Hex, http, isAddress, keccak256, parseAbi } from 'viem';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const ERC6551_REGISTRY_ABI = parseAbi([
  'function account(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt) view returns (address)',
]);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface FrogWalletBinding {
  tbaAddress: string;
  source: 'erc6551_registry' | 'deterministic_fallback';
  chainId: number;
}

const normalizeAddress = (value?: string): Hex | null => {
  if (!value || !isAddress(value)) {
    return null;
  }
  return getAddress(value) as Hex;
};

const parseSalt = (raw: string): bigint => {
  try {
    if (raw.startsWith('0x') || raw.startsWith('0X')) {
      return BigInt(raw);
    }
    return BigInt(raw || '0');
  } catch {
    return BigInt(0);
  }
};

export class FrogWalletService {
  private deriveDeterministicFallback(tokenId: number): string {
    const nftAddress = normalizeAddress(config.ZETAFROG_NFT_ADDRESS) || ZERO_ADDRESS;
    const chainId = Number.isInteger(config.CHAIN_ID) && config.CHAIN_ID > 0 ? config.CHAIN_ID : 7001;

    const entropy = keccak256(
      encodePacked(['uint256', 'address', 'uint256'], [BigInt(tokenId), nftAddress, BigInt(chainId)])
    );

    return getAddress(`0x${entropy.slice(-40)}` as Hex);
  }

  async deriveWallet(tokenId: number): Promise<FrogWalletBinding> {
    const chainId = Number.isInteger(config.CHAIN_ID) && config.CHAIN_ID > 0 ? config.CHAIN_ID : 7001;
    const registryAddress = normalizeAddress(config.ERC6551_REGISTRY_ADDRESS);
    const implementationAddress = normalizeAddress(config.ERC6551_ACCOUNT_IMPLEMENTATION);
    const nftAddress = normalizeAddress(config.ZETAFROG_NFT_ADDRESS);

    if (registryAddress && implementationAddress && nftAddress && config.ZETACHAIN_RPC_URL) {
      try {
        const client = createPublicClient({
          transport: http(config.ZETACHAIN_RPC_URL),
        });

        const tbaAddress = await client.readContract({
          address: registryAddress,
          abi: ERC6551_REGISTRY_ABI,
          functionName: 'account',
          args: [
            implementationAddress,
            BigInt(chainId),
            nftAddress,
            BigInt(tokenId),
            parseSalt(config.ERC6551_SALT),
          ],
        });

        if (typeof tbaAddress === 'string' && isAddress(tbaAddress)) {
          return {
            tbaAddress: getAddress(tbaAddress),
            source: 'erc6551_registry',
            chainId,
          };
        }
      } catch (error) {
        logger.warn('[FrogWalletService] Failed to derive TBA from ERC-6551 registry, fallback to deterministic address', {
          tokenId,
          error,
        });
      }
    }

    return {
      tbaAddress: this.deriveDeterministicFallback(tokenId),
      source: 'deterministic_fallback',
      chainId,
    };
  }
}

export const frogWalletService = new FrogWalletService();
