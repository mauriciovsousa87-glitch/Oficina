import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTools, FaLayerGroup, FaChartBar, FaCog, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { isSupabaseConfigured } from '../services/supabaseClient';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const dbConnected = isSupabaseConfigured();

  const toggle = () => setIsOpen(!isOpen);

  const linkClass = (isActive: boolean) => 
    `flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-slate-900 flex flex-col transition-all duration-300 relative border-r border-slate-800`}>
      {/* Visual Change: Header is now Blue-900/Transparent gradient to indicate v2.0 */}
      <div className={`p-4 flex items-center justify-between border-b border-slate-800 h-16 ${isOpen ? 'bg-gradient-to-r from-blue-900 to-slate-900' : ''}`}>
        {isOpen && <h1 className="text-xl font-bold text-white tracking-wider">OFICINA<span className="text-blue-500">SYS</span></h1>}
        <button onClick={toggle} className="text-slate-400 hover:text-white focus:outline-none">
          {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" className={({ isActive }) => linkClass(isActive)}>
          <FaTools className="text-xl min-w-[20px]" />
          {isOpen && <span className="font-medium">Oficina</span>}
        </NavLink>
        
        <NavLink to="/scaffolding" className={({ isActive }) => 
            `flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 ${
              isActive 
                ? 'bg-orange-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
        }>
          <FaLayerGroup className="text-xl min-w-[20px]" />
          {isOpen && <span className="font-medium">Andaimes</span>}
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => linkClass(isActive)}>
          <FaChartBar className="text-xl min-w-[20px]" />
          {isOpen && <span className="font-medium">Relatórios</span>}
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>
          <FaCog className="text-xl min-w-[20px]" />
          {isOpen && <span className="font-medium">Configuração</span>}
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
          <div className={`w-3 h-3 rounded-full ${dbConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} title={dbConnected ? 'Conectado' : 'Sem conexão (Modo Offline)'}></div>
          {isOpen && (
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-widest">{dbConnected ? 'Online' : 'Offline'}</span>
                <span className="text-[10px] text-slate-400 font-mono">v3.0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;