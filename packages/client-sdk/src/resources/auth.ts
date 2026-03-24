import { HttpClient } from '../core/http';

export interface WalletNoncePayload {
  walletAddress: string;
}

export interface WalletLoginPayload {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface AuthResourceClient {
  getNonce(payload: WalletNoncePayload): Promise<unknown>;
  login(payload: WalletLoginPayload): Promise<unknown>;
  me(): Promise<unknown>;
}

export const createAuthResourceClient = (httpClient: HttpClient): AuthResourceClient => {
  return {
    getNonce: (payload) =>
      httpClient.post('/v1/auth/nonce', {
        body: payload,
      }),
    login: (payload) =>
      httpClient.post('/v1/auth/wallet', {
        body: payload,
      }),
    me: () =>
      httpClient.get('/v1/me'),
  };
};
