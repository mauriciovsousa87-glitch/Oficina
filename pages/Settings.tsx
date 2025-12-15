
import React, { useState, useEffect } from 'react';
import { FaPen, FaPlus, FaCloud, FaSave, FaTimes, FaTools, FaSnowflake, FaCogs, FaFire } from 'react-icons/fa';
import * as reservationService from '../services/reservationService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Equipment } from '../types';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'oficina' | 'refrigeracao' | 'armstrong'>('oficina');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  // Form State
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('machine');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    setIsConnected(isSupabaseConfigured());
  }, []);

  const load = async () => {
    setLoading(true);
    try {
        const data = await reservationService.getEquipment(true);
        setEquipment(data);
    } catch (error) {
        console.error("Error loading equipment:", error);
    } finally {
        setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter(e => {
      if (activeTab === 'oficina') return e.type === 'machine' || e.type === 'tool' || e.type === 'vehicle';
      if (activeTab === 'refrigeracao') return e.type === 'area';
      if (activeTab === 'armstrong') return e.type === 'steam';
      return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName) return;
    
    setLoading(true);
    try {
        const existing = equipment.find(e => e.id === editingId);
        // Force type based on tab if creating new
        let typeToSave = eqType;
        if (activeTab === 'refrigeracao') typeToSave = 'area';
        if (activeTab === 'armstrong') typeToSave = 'steam';

        await reservationService.saveEquipment({
            id: editingId || '',
            name: eqName,
            type: typeToSave as any,
            isActive: existing ? existing.isActive : true
        });
        
        setEqName('');
        setEditingId(null);
        await load(); 
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  const handleEditClick = (eq: Equipment) => {
      setEditingId(eq.id);
      setEqName(eq.name);
      setEqType(eq.type);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (eq: Equipment) => {
      const newStatus = !eq.isActive;
      setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, isActive: newStatus } : e));
      try {
          await reservationService.saveEquipment({ ...eq, isActive: newStatus });
          load();
      } catch (e) {
          setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, isActive: !newStatus } : e));
      }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                <FaCloud />
                {isConnected ? 'Conectado' : 'Offline'}
          </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveTab('oficina')} className={`pb-2 px-4 font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'oficina' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>
              <FaTools /> Oficina
          </button>
          <button onClick={() => setActiveTab('refrigeracao')} className={`pb-2 px-4 font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'refrigeracao' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-400'}`}>
              <FaSnowflake /> Refrigeração
          </button>
          <button onClick={() => setActiveTab('armstrong')} className={`pb-2 px-4 font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'armstrong' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-400'}`}>
              <FaFire /> Armstrong
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-xl font-bold text-slate-700 mb-4">{editingId ? 'Editar Item' : 'Adicionar Item'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
              <input value={eqName} onChange={e => setEqName(e.target.value)} className="w-full p-2 border rounded" placeholder={activeTab === 'oficina' ? 'Ex: Torno Mecânico' : 'Ex: Purgador Linha 501'} disabled={loading} />
            </div>
            
            {activeTab === 'oficina' && (
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select value={eqType} onChange={e => setEqType(e.target.value)} className="w-full p-2 border rounded" disabled={loading}>
                    <option value="machine">Máquina</option>
                    <option value="tool">Ferramenta</option>
                    <option value="vehicle">Veículo</option>
                </select>
                </div>
            )}
            
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition-colors">
                {editingId ? 'Salvar Alterações' : 'Adicionar'}
            </button>
            {editingId && <button type="button" onClick={() => {setEditingId(null); setEqName('');}} className="w-full mt-2 text-slate-400 text-sm">Cancelar</button>}
          </form>
        </div>

        {/* List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-700 mb-4">Itens Cadastrados</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredEquipment.length > 0 ? filteredEquipment.map(eq => (
                <div key={eq.id} className={`flex justify-between items-center p-3 rounded border ${eq.isActive ? 'bg-white' : 'bg-slate-50'}`}>
                    <div>
                        <span className={`font-semibold block ${eq.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{eq.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{eq.type}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleToggleStatus(eq)} className={`px-2 py-1 text-xs rounded font-bold ${eq.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{eq.isActive ? 'Ativo' : 'Inativo'}</button>
                        <button onClick={() => handleEditClick(eq)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded"><FaPen size={10}/></button>
                    </div>
                </div>
            )) : <p className="text-slate-400 italic">Nenhum item.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;