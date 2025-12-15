
import React, { useState, useEffect } from 'react';
import { FaFire, FaPlus, FaTrash, FaMoneyBillWave, FaInfoCircle } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Equipment, Reservation } from '../types';
import * as reservationService from '../services/reservationService';

const Armstrong: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  const [formData, setFormData] = useState({
    resourceId: '',
    date: '',
    startTime: '',
    endTime: '',
    requester: '',
    observation: '',
    costSaved: 0
  });

  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allEquip = await reservationService.getEquipment(true);
      // Filter for 'steam' type equipment
      setEquipmentList(allEquip.filter(e => e.type === 'steam'));
      
      const allRes = await reservationService.getAllReservations();
      setReservations(allRes.filter(r => r.type === 'armstrong'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const handleNextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  const openNewReservation = (date?: Date, time?: string) => {
    const d = date || new Date();
    let startT = time || '08:00';
    const hourIndex = HOURS.indexOf(startT);
    let endT = (hourIndex !== -1 && hourIndex < HOURS.length - 1) ? HOURS[hourIndex + 1] : HOURS[HOURS.length - 1];

    setFormData({
      resourceId: '',
      date: d.toISOString().split('T')[0],
      startTime: startT,
      endTime: endT,
      requester: '',
      observation: '',
      costSaved: 0
    });
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, time: string) => openNewReservation(date, time);
  const handleEventClick = (res: Reservation) => {
    setSelectedReservation(res);
    setFormData({
        resourceId: res.resourceId,
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        requester: res.requester,
        observation: res.observation || '',
        costSaved: res.costSaved || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReservation) return alert("Edição não suportada.");
    const resource = equipmentList.find(m => m.id === formData.resourceId);
    
    try {
      await reservationService.createReservation({
        resourceId: formData.resourceId,
        resourceName: resource?.name || 'Equipamento',
        type: 'armstrong',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester,
        observation: formData.observation,
        costSaved: Number(formData.costSaved)
      });
      alert("Manutenção Agendada!");
      loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePassword !== MASTER_PASSWORD) return alert("Senha incorreta");
    if (selectedReservation) {
        await reservationService.deleteReservation(selectedReservation.id);
        setShowDeleteConfirm(false);
        setIsModalOpen(false);
        loadData();
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col bg-rose-50/30">
        <header className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <FaFire className="text-rose-600" /> Armstrong (Vapor)
                </h1>
                <p className="text-rose-700 mt-1">Gestão de purgadores e sistemas de vapor.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={() => openNewReservation()} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-bold shadow flex gap-2 items-center">
                    <FaPlus /> Nova Manutenção
                </button>
                <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={handlePrevWeek} className="px-3 hover:bg-slate-100 rounded">Anterior</button>
                    <button onClick={handleNextWeek} className="px-3 hover:bg-slate-100 rounded">Próximo</button>
                </div>
            </div>
        </header>

        {loading ? <div>Carregando...</div> : (
             <div className="flex-1 overflow-hidden">
                <div className="bg-rose-50 p-2 mb-2 rounded border border-rose-100 text-xs text-rose-800 flex gap-2 items-center">
                    <FaInfoCircle /> 
                    <span>Cadastre as Estações de Vapor ou Linhas na aba Configurações (Aba Armstrong).</span>
                </div>
                <CalendarView 
                    currentDate={currentDate}
                    onSlotClick={handleSlotClick}
                    onEventClick={handleEventClick}
                    reservations={reservations}
                    themeColor="orange" // Using orange theme structure but effectively we want Redish override if possible, currently CalendarView only supports blue/orange. Orange is close enough for heat.
                />
             </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <div className="p-6 bg-white rounded-lg">
                <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FaFire className="text-rose-500" /> {selectedReservation ? 'Detalhes' : 'Nova Intervenção'}
                </h2>
                
                {selectedReservation && (
                     <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm font-bold flex gap-1 items-center mb-4"><FaTrash/> Excluir</button>
                )}

                {!showDeleteConfirm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Equipamento / Linha</label>
                        <select className="w-full p-2 border rounded" value={formData.resourceId} onChange={e => setFormData({...formData, resourceId: e.target.value})} disabled={!!selectedReservation}>
                            <option value="">Selecione...</option>
                            {equipmentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                            <input type="date" className="w-full p-2 border rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} disabled={!!selectedReservation} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Técnico</label>
                            <input type="text" className="w-full p-2 border rounded" value={formData.requester} onChange={e => setFormData({...formData, requester: e.target.value})} disabled={!!selectedReservation} placeholder="Nome do técnico" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
                             <select className="w-full p-2 border rounded" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} disabled={!!selectedReservation}>
                                 {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Fim</label>
                             <select className="w-full p-2 border rounded" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} disabled={!!selectedReservation}>
                                 {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                             </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Serviço / Defeito (Ex: Vazamento)</label>
                        <input className="w-full p-2 border rounded" value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} disabled={!!selectedReservation} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-green-600 mb-1 flex items-center gap-1"><FaMoneyBillWave/> Custo Evitado (R$)</label>
                        <input type="number" step="0.01" className="w-full p-2 border border-green-200 bg-green-50 rounded" value={formData.costSaved} onChange={e => setFormData({...formData, costSaved: Number(e.target.value)})} disabled={!!selectedReservation} placeholder="0.00" />
                        <p className="text-[10px] text-slate-400 mt-1">Calcule baseado na perda de vapor (kg/h) eliminada.</p>
                     </div>

                     {!selectedReservation && <button type="submit" className="w-full bg-rose-600 text-white font-bold py-2 rounded hover:bg-rose-700 shadow-lg shadow-rose-500/30">Agendar</button>}
                </form>
                ) : (
                    <form onSubmit={confirmDelete} className="bg-red-50 p-4 rounded border border-red-100">
                        <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="w-full p-2 border rounded mb-2" placeholder="Senha mestre" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-200 py-2 rounded">Cancelar</button>
                            <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold">Excluir</button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    </div>
  );
};

export default Armstrong;