import React, { useState, useEffect } from 'react';
import { FaPen, FaPlus, FaCloud, FaSave, FaTimes } from 'react-icons/fa';
import * as reservationService from '../services/reservationService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Equipment } from '../types';

const Settings: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  // Form State
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('machine');
  const [editingId, setEditingId] = useState<string | null>(null); // If set, we are editing
  
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    setIsConnected(isSupabaseConfigured());
  }, []);

  const load = async () => {
    setLoading(true);
    try {
        // Fetch ALL equipment (Active and Inactive) for settings management
        const data = await reservationService.getEquipment(true);
        setEquipment(data);
    } catch (error) {
        console.error("Error loading equipment:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName) return;
    
    setLoading(true);
    try {
        // Find existing to preserve isActive status if editing, else default true
        const existing = equipment.find(e => e.id === editingId);
        
        await reservationService.saveEquipment({
            id: editingId || '', // Empty ID means insert new
            name: eqName,
            type: eqType as any,
            isActive: existing ? existing.isActive : true
        });
        
        // Reset form
        setEqName('');
        setEqType('machine');
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
      // Scroll to top to see form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEqName('');
      setEqType('machine');
  };

  const handleToggleStatus = async (eq: Equipment) => {
      // Optimistic Update
      const newStatus = !eq.isActive;
      setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, isActive: newStatus } : e));

      try {
          await reservationService.saveEquipment({
              ...eq,
              isActive: newStatus
          });
          // Silent background refresh
          load();
      } catch (e) {
          console.error("Error toggling status", e);
          // Revert on error
          setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, isActive: !newStatus } : e));
          alert("Erro ao alterar status.");
      }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
          
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                <FaCloud />
                {isConnected ? 'Banco de Dados Conectado' : 'Modo Offline'}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Add/Edit Form */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${editingId ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-700">
                {editingId ? 'Editar Equipamento' : 'Adicionar Equipamento'}
            </h2>
            {editingId && (
                <button onClick={handleCancelEdit} className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1">
                    <FaTimes /> Cancelar
                </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
              <input 
                value={eqName}
                onChange={e => setEqName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Torno Mecânico"
                disabled={loading}
              />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
               <select 
                value={eqType} 
                onChange={e => setEqType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={loading}
               >
                   <option value="machine">Máquina</option>
                   <option value="tool">Ferramenta</option>
                   <option value="vehicle">Veículo</option>
               </select>
            </div>
            
            <button 
                type="submit" 
                className={`flex items-center justify-center gap-2 w-full text-white font-bold py-3 rounded transition-all shadow-md ${
                    editingId 
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading}
            >
                {editingId ? <FaSave /> : <FaPlus />} 
                {loading ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Adicionar')}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-700 mb-4">Gerenciar Equipamentos</h2>
          
          <div className={`space-y-2 max-h-[500px] overflow-y-auto pr-2`}>
            {equipment.length > 0 ? (
                equipment.map(eq => (
                    <div key={eq.id} className={`flex justify-between items-center p-3 rounded border transition-colors ${eq.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-1 h-10 rounded-full ${eq.isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                            <div>
                                <span className={`font-semibold block ${eq.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{eq.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{eq.type}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Toggle Switch */}
                            <button 
                                onClick={() => handleToggleStatus(eq)}
                                className={`relative w-11 h-6 transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${eq.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                title={eq.isActive ? "Desativar" : "Ativar"}
                            >
                                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform shadow-sm ${eq.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>

                            {/* Edit Button */}
                            <button 
                                onClick={() => handleEditClick(eq)} 
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                title="Editar"
                            >
                                <FaPen size={12} />
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-slate-400 italic text-center py-8 bg-slate-50 rounded border border-dashed border-slate-200">
                    {loading ? 'Carregando...' : 'Nenhum equipamento cadastrado.'}
                </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;