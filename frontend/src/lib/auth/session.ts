const TOKEN_STORAGE_KEYS = ['authToken', 'token', 'jwt', 'accessToken'] as const;
const ADDRESS_STORAGE_KEYS = ['walletAddress', 'address', 'ownerAddress'] as const;

const readLocalStorage = (keys: readonly string[]): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  return null;
};

export const getSessionToken = (): string | null => readLocalStorage(TOKEN_STORAGE_KEYS);

export const getSessionWalletAddress = (): string | null => readLocalStorage(ADDRESS_STORAGE_KEYS);

export const buildSessionAuthHeaders = (): Record<string, string> => {
  const token = getSessionToken();
  if (token) {
    return {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    };
  }

  const walletAddress = getSessionWalletAddress();
  if (walletAddress) {
    return {
      'x-wallet-address': walletAddress,
    };
  }

  return {};
};
