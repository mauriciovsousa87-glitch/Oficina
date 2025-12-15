import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaUndo, FaExclamationTriangle, FaCloud } from 'react-icons/fa';
import * as reservationService from '../services/reservationService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Equipment } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const Settings: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [newEqName, setNewEqName] = useState('');
  const [newEqType, setNewEqType] = useState('machine');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    load();
    setIsConnected(isSupabaseConfigured());
  }, []);

  const load = async () => {
    try {
        const data = await reservationService.getEquipment();
        setEquipment(data);
    } catch (error) {
        console.error("Error loading equipment:", error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName) return;
    
    try {
        await reservationService.saveEquipment({
            id: '', 
            name: newEqName,
            type: newEqType as any,
            isActive: true
        });
        setNewEqName('');
        await load(); 
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja remover este equipamento?")) {
        try {
            await reservationService.deleteEquipment(id);
            await load();
        } catch (e) {
            console.error("Failed to delete", e);
            alert("Erro ao excluir. Tente novamente.");
        }
    }
  };

  const restoreDefaults = async () => {
    if (window.confirm("Isso irá recriar os equipamentos padrão. Continuar?")) {
        for (const eq of INITIAL_EQUIPMENT) {
            await reservationService.saveEquipment(eq);
        }
        await load();
    }
  };

  const handleHardReset = () => {
    const confirmation = prompt("DIGITE 'RESET' para limpar cache local e recarregar. (Dados do servidor não serão apagados)");
    if (confirmation === 'RESET') {
        localStorage.clear();
        window.location.reload();
    }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                <FaCloud />
                {isConnected ? 'Banco de Dados Conectado' : 'Modo Offline'}
            </div>
            
            <button 
                onClick={handleHardReset}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded flex items-center gap-2 border border-red-100 transition-colors"
            >
                <FaExclamationTriangle /> Resetar App
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Add New Equipment */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-700">Adicionar Equipamento</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
              <input 
                value={newEqName}
                onChange={e => setNewEqName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Ex: Torno Mecânico"
              />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
               <select 
                value={newEqType} 
                onChange={e => setNewEqType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded"
               >
                   <option value="machine">Máquina</option>
                   <option value="tool">Ferramenta</option>
                   <option value="vehicle">Veículo</option>
               </select>
            </div>
            <button type="submit" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors">
                <FaPlus /> Adicionar
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-700">Equipamentos Ativos</h2>
            {equipment.length === 0 && !isConnected && (
                <button onClick={restoreDefaults} className="text-xs flex items-center gap-1 text-blue-500 hover:underline">
                    <FaUndo /> Restaurar Padrões
                </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {equipment.length > 0 ? (
                equipment.map(eq => (
                    <div key={eq.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                        <div>
                            <span className="font-semibold text-slate-700">{eq.name}</span>
                            <span className="text-xs text-slate-400 block uppercase">{eq.type}</span>
                        </div>
                        <button 
                            onClick={() => handleDelete(eq.id)} 
                            className="text-slate-300 hover:text-red-500 p-2 transition-colors cursor-pointer"
                            title="Excluir"
                        >
                            <FaTrash />
                        </button>
                    </div>
                ))
            ) : (
                <p className="text-slate-400 italic text-center py-4">Nenhum equipamento encontrado.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;