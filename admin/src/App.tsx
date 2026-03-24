import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import { AdminAuthGate } from './components/auth/AdminAuthGate';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Frogs = lazy(() => import('./pages/Frogs'));
const Badges = lazy(() => import('./pages/Badges'));
const Friends = lazy(() => import('./pages/Friends'));
const Travels = lazy(() => import('./pages/Travels'));
const Config = lazy(() => import('./pages/Config'));
const Verifications = lazy(() => import('./pages/Verifications'));
const Rituals = lazy(() => import('./pages/Rituals'));
const MemoryPalaces = lazy(() => import('./pages/MemoryPalaces'));
const Attestations = lazy(() => import('./pages/Attestations'));
const V3Ops = lazy(() => import('./pages/V3Ops'));
const CouncilAudit = lazy(() => import('./pages/CouncilAudit'));
const Creators = lazy(() => import('./pages/Creators'));
const Partners = lazy(() => import('./pages/Partners'));
const RelationshipGraph = lazy(() => import('./pages/RelationshipGraph'));
const V3Dashboard = lazy(() => import('./pages/V3Dashboard'));

function App() {
  return (
    <AdminAuthGate>
      <BrowserRouter>
        <Suspense
          fallback={(
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
              <Spin size="large" />
            </div>
          )}
        >
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="frogs" element={<Frogs />} />
              <Route path="badges" element={<Badges />} />
              <Route path="friends" element={<Friends />} />
              <Route path="travels" element={<Travels />} />
              <Route path="verifications" element={<Verifications />} />
              <Route path="rituals" element={<Rituals />} />
              <Route path="memory-palaces" element={<MemoryPalaces />} />
              <Route path="attestations" element={<Attestations />} />
              <Route path="v3-ops" element={<V3Ops />} />
              <Route path="council-audit" element={<CouncilAudit />} />
              <Route path="creators" element={<Creators />} />
              <Route path="partners" element={<Partners />} />
              <Route path="relationship-graph" element={<RelationshipGraph />} />
              <Route path="relationship-graph/:appId/:frogId" element={<RelationshipGraph />} />
              <Route path="v3-dashboard" element={<V3Dashboard />} />
              <Route path="config" element={<Config />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AdminAuthGate>
  );
}

export default App;
