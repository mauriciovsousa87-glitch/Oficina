import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaUndo, FaExclamationTriangle } from 'react-icons/fa';
import * as reservationService from '../services/reservationService';
import { Equipment } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const Settings: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [newEqName, setNewEqName] = useState('');
  const [newEqType, setNewEqType] = useState('machine');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await reservationService.getEquipment();
    setEquipment(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName) return;
    
    // Optimistic update
    const tempId = Math.random().toString();
    const tempEq: Equipment = { id: tempId, name: newEqName, type: newEqType as any, isActive: true };
    setEquipment([...equipment, tempEq]);
    setNewEqName('');

    try {
        await reservationService.saveEquipment({
        id: '', 
        name: tempEq.name,
        type: tempEq.type,
        isActive: true
        });
        load(); // Reload to get real ID
    } catch (e) {
        console.error(e);
        load(); // Revert on error
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este equipamento?")) {
        // Optimistic update: remove immediately from UI
        setEquipment(prev => prev.filter(e => e.id !== id));
        
        try {
            await reservationService.deleteEquipment(id);
        } catch (e) {
            console.error("Failed to delete", e);
            alert("Erro ao excluir. Tente novamente.");
            load(); // Revert
        }
    }
  };

  const restoreDefaults = async () => {
    if (confirm("Isso irá recriar os equipamentos padrão. Continuar?")) {
        setEquipment([...INITIAL_EQUIPMENT]); // Optimistic
        for (const eq of INITIAL_EQUIPMENT) {
            await reservationService.saveEquipment(eq);
        }
        load();
    }
  };

  const handleHardReset = () => {
    const confirmation = prompt("DIGITE 'RESET' para apagar todos os dados locais e recarregar o sistema. Isso não pode ser desfeito.");
    if (confirmation === 'RESET') {
        localStorage.clear();
        window.location.reload();
    }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
          <button 
            onClick={handleHardReset}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded flex items-center gap-2 border border-red-200 transition-colors"
          >
              <FaExclamationTriangle /> Resetar Sistema Completo
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Add New */}
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
            {equipment.length === 0 && (
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
                            className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                            title="Excluir"
                        >
                            <FaTrash />
                        </button>
                    </div>
                ))
            ) : (
                <p className="text-slate-400 italic text-center py-4">Nenhum equipamento cadastrado.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;