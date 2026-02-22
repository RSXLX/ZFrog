import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { MyFrog } from './pages/MyFrog';
import { FrogDetail } from './pages/FrogDetail';
import { Desktop } from './pages/Desktop';
import { Friends } from './pages/Friends';
import { GardenPage } from './pages/GardenPage';
import { Navbar } from './components/common/Navbar';
import { LoadingSkeleton } from './components/common/LoadingSkeleton';
import { ToastProvider } from './components/common/ToastProvider';
import { FrogPet } from './components/frog/FrogPet';
import { useWalletConnect } from './hooks/useWalletConnect';
import { FriendFloatPanel } from './components/friend-float';


// Lazy loaded pages for code splitting
const TravelResultPage = lazy(() => import('./pages/TravelResultPage').then(m => ({ default: m.TravelResultPage })));
const TravelHistoryPage = lazy(() => import('./pages/TravelHistoryPage').then(m => ({ default: m.TravelHistoryPage })));
const TravelDetailPage = lazy(() => import('./pages/TravelDetailPage').then(m => ({ default: m.TravelDetailPage })));
const BadgesPage = lazy(() => import('./pages/BadgesPage').then(m => ({ default: m.BadgesPage })));
const SouvenirsPage = lazy(() => import('./pages/SouvenirsPage').then(m => ({ default: m.SouvenirsPage })));
const AnimationDemoPage = lazy(() => import('./pages/AnimationDemoPage').then(m => ({ default: m.AnimationDemoPage })));
const HomeScenePage = lazy(() => import('./pages/HomeScenePage').then(m => ({ default: m.HomeScenePage })));

// Helper to check if running in Tauri
const isTauri = () => !!(window as any).__TAURI_INTERNALS__;

// 钱包连接初始化组件
function WalletInitializer() {
  useWalletConnect();
  return null;
}

export function App() {
  const [isFrogWindow, setIsFrogWindow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkWindow() {
      if (isTauri()) {
        try {
          // Dynamic import to avoid issues in browser mode
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          if (win.label.startsWith('frog')) {
            setIsFrogWindow(true);
            document.body.style.backgroundColor = 'transparent';
            // Remove background gradient if present on root
            document.getElementById('root')?.classList.remove('bg-gradient-to-b');
          }
        } catch (e) {
          console.error("Failed to check window label:", e);
        }
      }
      setReady(true);
    }
    checkWindow();
  }, []);

  if (!ready) return null;

  if (isFrogWindow) {
    return (
      <>
        <WalletInitializer />
        <FrogPet frogId={0} name="Desktop Frog" />
      </>
    );
  }

  return (
    <ToastProvider>
      <WalletInitializer />
      <BrowserRouter>
        <div className="min-h-screen">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Suspense fallback={<LoadingSkeleton type="page" />}>
              <Routes>
                {/* 首页 */}
                <Route path="/" element={<Home />} />
                
                {/* 我的青蛙（每个钱包一个） */}
                <Route path="/my-frog" element={<MyFrog />} />
                
                {/* 查看青蛙详情（支持查看他人青蛙） */}
                <Route path="/frog/:tokenId" element={<FrogDetail />} />
                
                {/* 好友系统（自动获取当前用户青蛙） */}
                <Route path="/friends" element={<Friends />} />
                
                {/* 我的家园（自动获取当前用户青蛙） */}
                <Route path="/garden" element={<GardenPage />} />
                
                {/* 访问他人家园 */}
                <Route path="/visit/:address" element={<GardenPage />} />
                
                {/* 我的纪念品（自动获取当前用户青蛙） */}
                <Route path="/souvenirs" element={<SouvenirsPage />} />
                
                {/* 我的徽章（自动获取当前用户青蛙） */}
                <Route path="/badges" element={<BadgesPage />} />
                
                {/* 旅行相关 */}
                <Route path="/travel/:travelId" element={<TravelResultPage />} />
                <Route path="/travel-detail/:travelId" element={<TravelDetailPage />} />
                <Route path="/travel-history" element={<TravelHistoryPage />} />
                
                {/* 其他 */}
                <Route path="/desktop" element={<Desktop />} />
                <Route path="/animation-demo" element={<AnimationDemoPage />} />
                <Route path="/home-scene" element={<HomeScenePage />} />
              </Routes>
            </Suspense>
          </main>
          
          {/* Footer */}
          <footer className="py-8 text-center text-slate-500 text-sm">
            <p>🐸 ZetaFrog - Hop Across Chains, Collect Stories</p>
            <p className="mt-1">Built with ❤️ on ZetaChain</p>
          </footer>
        </div>
        
        {/* 好友浮窗 */}
        <FriendFloatPanel />
      </BrowserRouter>
    </ToastProvider>
  );
}

