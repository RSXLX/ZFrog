import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Frogs from './pages/Frogs';
import Badges from './pages/Badges';
import Friends from './pages/Friends';
import Travels from './pages/Travels';
import Config from './pages/Config';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="frogs" element={<Frogs />} />
          <Route path="badges" element={<Badges />} />
          <Route path="friends" element={<Friends />} />
          <Route path="travels" element={<Travels />} />
          <Route path="config" element={<Config />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
