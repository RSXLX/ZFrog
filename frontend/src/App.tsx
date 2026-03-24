import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { MyFrog } from './pages/MyFrog';
import { EggClaimPage } from './pages/EggClaimPage';
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
import { useI18n } from './i18n';


// Lazy loaded pages for code splitting
const TravelResultPage = lazy(() => import('./pages/TravelResultPage').then(m => ({ default: m.TravelResultPage })));
const TravelHistoryPage = lazy(() => import('./pages/TravelHistoryPage').then(m => ({ default: m.TravelHistoryPage })));
const TravelDetailPage = lazy(() => import('./pages/TravelDetailPage').then(m => ({ default: m.TravelDetailPage })));
const MemoryPalacePage = lazy(() => import('./pages/MemoryPalacePage').then(m => ({ default: m.MemoryPalacePage })));
const BadgesPage = lazy(() => import('./pages/BadgesPage').then(m => ({ default: m.BadgesPage })));
const SouvenirsPage = lazy(() => import('./pages/SouvenirsPage').then(m => ({ default: m.SouvenirsPage })));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage').then(m => ({ default: m.FamiliesPage })));
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage').then(m => ({ default: m.CommunitiesPage })));
const JourneyPage = lazy(() => import('./pages/JourneyPage').then(m => ({ default: m.JourneyPage })));
const CouncilPage = lazy(() => import('./pages/CouncilPage').then(m => ({ default: m.CouncilPage })));
const MemoryWorldPage = lazy(() => import('./pages/MemoryWorldPage').then(m => ({ default: m.MemoryWorldPage })));
const CreatorPage = lazy(() => import('./pages/CreatorPage').then(m => ({ default: m.CreatorPage })));
const RelationshipGraphPage = lazy(() =>
  import('./pages/RelationshipGraphPage').then(m => ({ default: m.RelationshipGraphPage }))
);
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
  const { t, tr } = useI18n();
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
        <FrogPet frogId={0} name={tr('桌宠青蛙', 'Desktop Frog')} />
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

                {/* 认领青蛙蛋入口 */}
                <Route path="/egg-claim" element={<EggClaimPage />} />
                
                {/* 查看青蛙详情（支持查看他人青蛙） */}
                <Route path="/frog/:tokenId" element={<FrogDetail />} />
                
                {/* 好友系统（自动获取当前用户青蛙） */}
                <Route path="/friends" element={<Friends />} />
                <Route path="/families" element={<FamiliesPage />} />
                <Route path="/communities" element={<CommunitiesPage />} />
                
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
                <Route path="/travel-result/:travelId" element={<TravelResultPage />} />
                <Route path="/travel-detail/:travelId" element={<TravelDetailPage />} />
                <Route path="/travel-history" element={<TravelHistoryPage />} />
                <Route path="/journeys" element={<JourneyPage />} />
                <Route path="/council" element={<CouncilPage />} />
                <Route path="/memory-world" element={<MemoryWorldPage />} />
                <Route path="/memory-world/:worldId" element={<MemoryWorldPage />} />
                <Route path="/creator" element={<CreatorPage />} />
                <Route path="/relationship-graph" element={<RelationshipGraphPage />} />
                <Route path="/relationship-graph/:frogId" element={<RelationshipGraphPage />} />
                <Route path="/memory-palace/:frogId" element={<MemoryPalacePage />} />
                <Route path="/souvenirs/:frogId" element={<SouvenirsPage />} />
                
                {/* 其他 */}
                <Route path="/desktop" element={<Desktop />} />
                <Route path="/animation-demo" element={<AnimationDemoPage />} />
                <Route path="/home-scene" element={<HomeScenePage />} />
              </Routes>
            </Suspense>
          </main>
          
          {/* Footer */}
          <footer className="py-8 text-center text-slate-500 text-sm">
            <p>{t('app.footer.line1')}</p>
            <p className="mt-1">{t('app.footer.line2')}</p>
          </footer>
        </div>
        
        {/* 好友浮窗 */}
        <FriendFloatPanel />
      </BrowserRouter>
    </ToastProvider>
  );
}
