import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';
import { Home } from './pages/Home';
import { MyFrogs } from './pages/MyFrogs';
import { FrogDetail } from './pages/FrogDetail';
import { Navbar } from './components/common/Navbar';
import { FrogPet } from './components/frog/FrogPet';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

// Helper to check if running in Tauri
const isTauri = () => !!(window as any).__TAURI_INTERNALS__;

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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
             <FrogPet />
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/my-frogs" element={<MyFrogs />} />
                <Route path="/frog/:id" element={<FrogDetail />} />
              </Routes>
            </main>
            
            {/* Footer */}
            <footer className="py-8 text-center text-gray-500 text-sm">
              <p>🐸 ZetaFrog - Hop Across Chains, Collect Stories</p>
              <p className="mt-1">Built with ❤️ on ZetaChain</p>
            </footer>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
