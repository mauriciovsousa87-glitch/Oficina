
import React, { useState, useEffect } from 'react';
import { FaBolt, FaMicrochip, FaPlus, FaCheck, FaTrash, FaMoneyBillWave, FaExclamationTriangle } from 'react-icons/fa';
import Modal from '../components/Modal';
import { MaintenanceOrder } from '../types';
import * as reservationService from '../services/reservationService';
import { MASTER_PASSWORD } from '../constants';

interface RepairManagerProps {
  type: 'motor' | 'board';
}

const RepairManager: React.FC<RepairManagerProps> = ({ type }) => {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<MaintenanceOrder>>({
    itemName: '', description: '', status: 'pending', costSaved: 0, technician: ''
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  const isMotor = type === 'motor';
  const ThemeIcon = isMotor ? FaBolt : FaMicrochip;
  const themeColor = isMotor ? 'text-yellow-600' : 'text-emerald-600';
  const bgColor = isMotor ? 'bg-yellow-50' : 'bg-emerald-50';
  const btnColor = isMotor ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-emerald-600 hover:bg-emerald-700';

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await reservationService.getMaintenanceOrders(type);
        setOrders(data.sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()));
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = () => {
      setFormData({ itemName: '', description: '', status: 'pending', costSaved: 0, technician: '' });
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await reservationService.saveMaintenanceOrder({
            id: '',
            type,
            itemName: formData.itemName!,
            description: formData.description!,
            status: formData.status as any,
            costSaved: Number(formData.costSaved),
            technician: formData.technician,
            entryDate: new Date().toISOString().split('T')[0]
        });
        loadData();
        setIsModalOpen(false);
    } catch (e) {
        alert("Erro ao salvar");
    }
  };

  const handleStatusChange = async (order: MaintenanceOrder, newStatus: 'in_progress' | 'completed') => {
      // If completing, maybe ask for Cost Saved? For now, simplistic toggle.
      const updated = { ...order, status: newStatus, completionDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined };
      await reservationService.saveMaintenanceOrder(updated);
      loadData();
  };

  const handleDelete = async (e: React.FormEvent) => {
      e.preventDefault();
      if (deletePassword !== MASTER_PASSWORD) return alert("Senha incorreta");
      if (deleteId) {
          await reservationService.deleteMaintenanceOrder(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const getStatusBadge = (status: string) => {
      if (status === 'completed') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Concluído</span>;
      if (status === 'in_progress') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Em Andamento</span>;
      return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Pendente</span>;
  };

  return (
    <div className={`p-8 h-screen flex flex-col ${bgColor} overflow-y-auto`}>
       <header className="mb-6 flex justify-between items-center">
            <div>
                <h1 className={`text-3xl font-bold flex items-center gap-2 text-slate-800`}>
                    <ThemeIcon className={themeColor} /> 
                    {isMotor ? 'Sala de Motores' : 'Sala de Placas'}
                </h1>
                <p className={`${themeColor} mt-1 opacity-80`}>Gestão de manutenção e rebobinamento.</p>
            </div>
            <button onClick={handleCreate} className={`${btnColor} text-white px-6 py-2 rounded-lg font-bold shadow flex gap-2 items-center transition-transform active:scale-95`}>
                <FaPlus /> Novo Item
            </button>
        </header>

        {loading ? <div>Carregando...</div> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800">{order.itemName}</h3>
                                {getStatusBadge(order.status)}
                            </div>
                            <p className="text-sm text-slate-500 mb-4">{order.description}</p>
                            
                            <div className="text-xs text-slate-400 space-y-1">
                                <p>Entrada: {new Date(order.entryDate + 'T12:00:00').toLocaleDateString()}</p>
                                {order.completionDate && <p>Saída: {new Date(order.completionDate + 'T12:00:00').toLocaleDateString()}</p>}
                                {order.technician && <p>Técnico: {order.technician}</p>}
                            </div>

                            {order.costSaved > 0 && (
                                <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded flex items-center gap-2 text-green-700 font-bold text-sm">
                                    <FaMoneyBillWave /> R$ {order.costSaved.toFixed(2)}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <button onClick={() => setDeleteId(order.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <FaTrash />
                            </button>
                            
                            <div className="flex gap-2">
                                {order.status === 'pending' && (
                                    <button onClick={() => handleStatusChange(order, 'in_progress')} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200">
                                        Iniciar
                                    </button>
                                )}
                                {order.status !== 'completed' && (
                                    <button onClick={() => handleStatusChange(order, 'completed')} className="text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 flex items-center gap-1">
                                        <FaCheck /> Concluir
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <div className="p-6 bg-white rounded-lg">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Novo Registro</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Item (Tag/Nome)</label>
                        <input className="w-full p-2 border rounded" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} placeholder="Ex: Motor Bomba 501" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Motivo / Defeito</label>
                        <textarea className="w-full p-2 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Queima por sobrecarga..." rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Custo Evitado (R$)</label>
                            <input type="number" step="0.01" className="w-full p-2 border rounded" value={formData.costSaved} onChange={e => setFormData({...formData, costSaved: Number(e.target.value)})} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Técnico Responsável</label>
                            <input className="w-full p-2 border rounded" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" className={`w-full ${btnColor} text-white font-bold py-3 rounded mt-2`}>Salvar Registro</button>
                </form>
            </div>
        </Modal>

        {/* Delete Confirmation */}
        {deleteId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl w-80">
                    <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2"><FaExclamationTriangle/> Confirmar Exclusão</h3>
                    <form onSubmit={handleDelete}>
                        <input type="password" autoFocus placeholder="Senha mestre" className="w-full p-2 border rounded mb-3" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
                        <div className="flex gap-2">
                             <button type="button" onClick={() => { setDeleteId(null); setDeletePassword(''); }} className="flex-1 bg-slate-100 py-2 rounded">Cancelar</button>
                             <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold">Excluir</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default RepairManager;
