import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Wagmi 和 Web3Modal 集成
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';

// Web Vitals 性能监控
import { initWebVitals } from './utils/webVitals';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30秒内数据视为新鲜
      gcTime: 5 * 60 * 1000, // 5分钟后垃圾回收
      retry: 2, // 失败重试2次
    },
  },
});

// 在开发环境下初始化 Web Vitals 监控
if (import.meta.env.DEV) {
  initWebVitals((report) => {
    // 可以在这里添加自定义处理逻辑
    console.debug('[Performance]', report);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
