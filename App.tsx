
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Workshop from './pages/Workshop';
import Scaffolding from './pages/Scaffolding';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Refrigeration from './pages/Refrigeration';
import RepairManager from './pages/RepairManager';
import Machining from './pages/Machining';
import Armstrong from './pages/Armstrong';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex bg-slate-100 h-screen font-sans">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Workshop />} />
            <Route path="/scaffolding" element={<Scaffolding />} />
            
            {/* New Modules */}
            <Route path="/refrigeration" element={<Refrigeration />} />
            <Route path="/armstrong" element={<Armstrong />} />
            <Route path="/motors" element={<RepairManager type="motor" />} />
            <Route path="/boards" element={<RepairManager type="board" />} />
            <Route path="/machining" element={<Machining />} />

            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;