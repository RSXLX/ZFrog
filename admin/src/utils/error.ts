export function getApiErrorMessage(error: any, fallback = '请求失败') {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

