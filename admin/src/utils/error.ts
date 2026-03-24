type MaybeApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback = '请求失败') {
  const err = error as MaybeApiError;
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;
}
