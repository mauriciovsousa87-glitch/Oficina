
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTools, FaLayerGroup, FaChartBar, FaCog, FaChevronLeft, FaChevronRight, FaSnowflake, FaBolt, FaMicrochip, FaCogs, FaFire } from 'react-icons/fa';
import { isSupabaseConfigured } from '../services/supabaseClient';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const dbConnected = isSupabaseConfigured();

  const toggle = () => setIsOpen(!isOpen);

  const linkClass = (isActive: boolean, colorClass: string = 'bg-blue-600') => 
    `flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 ${
      isActive 
        ? `${colorClass} text-white shadow-lg` 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-slate-900 flex flex-col transition-all duration-300 relative border-r border-slate-800 flex-shrink-0 z-50`}>
      <div className={`p-4 flex items-center justify-between border-b border-slate-800 h-16 ${isOpen ? 'bg-gradient-to-r from-blue-900 to-slate-900' : ''}`}>
        {isOpen && <h1 className="text-xl font-bold text-white tracking-wider">OFICINA<span className="text-blue-500">SYS</span></h1>}
        <button onClick={toggle} className="text-slate-400 hover:text-white focus:outline-none">
          {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-2 px-3">{isOpen ? 'Operacional' : '---'}</div>
        
        <NavLink to="/" className={({ isActive }) => linkClass(isActive, 'bg-blue-600')}>
          <FaTools className="text-xl min-w-[20px]" title="Oficina Mecânica" />
          {isOpen && <span className="font-medium">Oficina</span>}
        </NavLink>
        
        <NavLink to="/scaffolding" className={({ isActive }) => linkClass(isActive, 'bg-orange-600')}>
          <FaLayerGroup className="text-xl min-w-[20px]" title="Andaimes" />
          {isOpen && <span className="font-medium">Andaimes</span>}
        </NavLink>

        <NavLink to="/machining" className={({ isActive }) => linkClass(isActive, 'bg-slate-600')}>
          <FaCogs className="text-xl min-w-[20px]" title="REC / Usinagem" />
          {isOpen && <span className="font-medium">REC (Usinagem)</span>}
        </NavLink>

        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-4 px-3">{isOpen ? 'Especialidades' : '---'}</div>

        <NavLink to="/refrigeration" className={({ isActive }) => linkClass(isActive, 'bg-cyan-600')}>
          <FaSnowflake className="text-xl min-w-[20px]" title="Refrigeração" />
          {isOpen && <span className="font-medium">Refrigeração</span>}
        </NavLink>

        <NavLink to="/armstrong" className={({ isActive }) => linkClass(isActive, 'bg-rose-600')}>
          <FaFire className="text-xl min-w-[20px]" title="Armstrong / Vapor" />
          {isOpen && <span className="font-medium">Armstrong (Vapor)</span>}
        </NavLink>

        <NavLink to="/motors" className={({ isActive }) => linkClass(isActive, 'bg-yellow-600')}>
          <FaBolt className="text-xl min-w-[20px]" title="Sala de Motores" />
          {isOpen && <span className="font-medium">Sala de Motores</span>}
        </NavLink>

        <NavLink to="/boards" className={({ isActive }) => linkClass(isActive, 'bg-emerald-600')}>
          <FaMicrochip className="text-xl min-w-[20px]" title="Sala de Placas" />
          {isOpen && <span className="font-medium">Sala de Placas</span>}
        </NavLink>

        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-4 px-3">{isOpen ? 'Gestão' : '---'}</div>

        <NavLink to="/reports" className={({ isActive }) => linkClass(isActive, 'bg-purple-600')}>
          <FaChartBar className="text-xl min-w-[20px]" title="Relatórios" />
          {isOpen && <span className="font-medium">Relatórios</span>}
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive, 'bg-slate-600')}>
          <FaCog className="text-xl min-w-[20px]" title="Configuração" />
          {isOpen && <span className="font-medium">Configuração</span>}
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
          <div className={`w-3 h-3 rounded-full ${dbConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} title={dbConnected ? 'Conectado' : 'Sem conexão (Modo Offline)'}></div>
          {isOpen && (
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-widest">{dbConnected ? 'Online' : 'Offline'}</span>
                <span className="text-[10px] text-slate-400 font-mono">v4.1</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;