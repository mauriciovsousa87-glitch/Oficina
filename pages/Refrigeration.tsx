
import React, { useState, useEffect } from 'react';
import { FaSnowflake, FaPlus, FaTrash, FaInfoCircle } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Equipment, Reservation } from '../types';
import * as reservationService from '../services/reservationService';

const Refrigeration: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [areas, setAreas] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    resourceId: '',
    date: '',
    startTime: '',
    endTime: '',
    technician: '',
    observation: ''
  });

  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get equipment with type 'area'
      const allEquip = await reservationService.getEquipment(true);
      const areaList = allEquip.filter(e => e.type === 'area');
      setAreas(areaList);
      
      const allRes = await reservationService.getAllReservations();
      setReservations(allRes.filter(r => r.type === 'refrigeration'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d);
  };
  const handleNextWeek = () => {
    const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d);
  };

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
      technician: '',
      observation: ''
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
        technician: res.requester,
        observation: res.observation || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReservation) return alert("Edição não suportada. Exclua e crie novamente.");
    const area = areas.find(a => a.id === formData.resourceId);
    
    try {
      await reservationService.createReservation({
        resourceId: formData.resourceId,
        resourceName: area?.name || 'Área Desconhecida',
        type: 'refrigeration',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.technician, // Using requester field for technician
        observation: formData.observation
      });
      alert("Escala salva!");
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
    <div className="p-8 h-screen flex flex-col bg-cyan-50/30">
        <header className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <FaSnowflake className="text-cyan-600" /> Refrigeração
                </h1>
                <p className="text-cyan-700 mt-1">Escala de manutenção preventiva e rotinas.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={() => openNewReservation()} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-bold shadow flex gap-2 items-center">
                    <FaPlus /> Nova Escala
                </button>
                <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={handlePrevWeek} className="px-3 hover:bg-slate-100 rounded">Anterior</button>
                    <button onClick={handleNextWeek} className="px-3 hover:bg-slate-100 rounded">Próximo</button>
                </div>
            </div>
        </header>

        {loading ? <div>Carregando...</div> : (
             <div className="flex-1 overflow-hidden">
                <div className="bg-cyan-50 p-2 mb-2 rounded border border-cyan-100 text-xs text-cyan-700 flex gap-2 items-center">
                    <FaInfoCircle /> Configure as Áreas (Linha 501, Adegas...) na aba Configurações.
                </div>
                <CalendarView 
                    currentDate={currentDate}
                    onSlotClick={handleSlotClick}
                    onEventClick={handleEventClick}
                    reservations={reservations}
                    themeColor="blue" // Reusing blue theme for cold look
                />
             </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <div className="p-6 bg-white rounded-lg">
                <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FaSnowflake className="text-cyan-500" /> 
                    {selectedReservation ? 'Detalhes da Escala' : 'Nova Escala'}
                </h2>
                
                {selectedReservation && (
                     <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm font-bold flex gap-1 items-center mb-4"><FaTrash/> Excluir</button>
                )}

                {!showDeleteConfirm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Área / Setor</label>
                        <select className="w-full p-2 border rounded" value={formData.resourceId} onChange={e => setFormData({...formData, resourceId: e.target.value})} disabled={!!selectedReservation}>
                            <option value="">Selecione...</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                            <input type="date" className="w-full p-2 border rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} disabled={!!selectedReservation} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Técnico/Time</label>
                            <input type="text" className="w-full p-2 border rounded" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} disabled={!!selectedReservation} placeholder="Ex: João Silva" />
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
                        <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                        <input className="w-full p-2 border rounded" value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} disabled={!!selectedReservation} />
                     </div>
                     {!selectedReservation && <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-2 rounded hover:bg-cyan-700">Salvar</button>}
                </form>
                ) : (
                    <form onSubmit={confirmDelete} className="bg-red-50 p-4 rounded border border-red-100">
                        <p className="text-red-800 font-bold mb-2">Digite a senha para excluir:</p>
                        <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="w-full p-2 border rounded mb-2" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-200 py-2 rounded">Cancelar</button>
                            <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold">Confirmar</button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    </div>
  );
};

export default Refrigeration;
