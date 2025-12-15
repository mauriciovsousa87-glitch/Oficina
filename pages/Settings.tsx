import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaUndo } from 'react-icons/fa';
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
    
    await reservationService.saveEquipment({
      id: '', // Service handles ID
      name: newEqName,
      type: newEqType as any,
      isActive: true
    });
    setNewEqName('');
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este equipamento?")) {
        await reservationService.deleteEquipment(id);
        load();
    }
  };

  const restoreDefaults = async () => {
    if (confirm("Isso irá recriar os equipamentos padrão. Continuar?")) {
        for (const eq of INITIAL_EQUIPMENT) {
            await reservationService.saveEquipment(eq);
        }
        load();
    }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Configurações</h1>

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
            <button type="submit" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">
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
            {equipment.map(eq => (
                <div key={eq.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                    <div>
                        <span className="font-semibold text-slate-700">{eq.name}</span>
                        <span className="text-xs text-slate-400 block uppercase">{eq.type}</span>
                    </div>
                    <button onClick={() => handleDelete(eq.id)} className="text-red-400 hover:text-red-600 p-2">
                        <FaTrash />
                    </button>
                </div>
            ))}
            {equipment.length === 0 && <p className="text-slate-400 italic text-center py-4">Nenhum equipamento cadastrado.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
