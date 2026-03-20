export interface NonceRequestInput {
  walletAddress: string;
}

export interface NoncePayload {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface WalletLoginInput {
  walletAddress: string;
  signature: string;
  chainId?: number;
}

export interface WalletLoginPayload {
  token: string;
  walletAddress: string;
  frogTokenId: number | null;
  hasFrog: boolean;
}

export interface WorldProofInput {
  nullifierHash?: string;
  proof: string;
  [key: string]: unknown;
}

export interface WorldVerifyInput {
  action: string;
  walletAddress: string;
  proof: WorldProofInput;
  signal?: string;
}

export interface WorldVerifyPayload {
  verified: boolean;
  verificationId: string;
  action: string;
}
