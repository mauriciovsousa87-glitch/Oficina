import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTools, FaInfoCircle, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Equipment, Reservation } from '../types';
import * as reservationService from '../services/reservationService';

const Workshop: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  
  // Password Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Selected reservation for details
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    resourceId: '',
    date: '',
    startTime: '',
    endTime: '',
    requester: '',
    observation: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const equip = await reservationService.getEquipment(false);
      setEquipmentList(equip.filter(e => e.type !== 'vehicle'));
      
      const allRes = await reservationService.getAllReservations();
      setReservations(allRes.filter(r => r.type === 'workshop'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Date Navigation (Weekly) ---
  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // --- Modal Logic ---
  const openNewReservation = (date?: Date, time?: string) => {
    const d = date || new Date();
    // Default to next hour if not specified
    let startT = time || '08:00';
    
    // Auto calculate end time (1 hour duration default)
    const hourIndex = HOURS.indexOf(startT);
    let endT = '';
    if (hourIndex !== -1 && hourIndex < HOURS.length - 1) {
        endT = HOURS[hourIndex + 1];
    } else {
        endT = HOURS[HOURS.length - 1]; // Max limit
    }

    setFormData({
      resourceId: '',
      date: d.toISOString().split('T')[0],
      startTime: startT,
      endTime: endT,
      requester: '',
      observation: ''
    });
    setSelectedReservation(null);
    setIsReservationModalOpen(true);
  };

  const handleSlotClick = (date: Date, time: string) => {
    openNewReservation(date, time);
  };

  const handleEventClick = (res: Reservation) => {
    setSelectedReservation(res);
    // Don't open the form modal, maybe show details or just allow delete from a small popup?
    // For now, let's open a detail view inside the modal using the form but read-only or pre-filled?
    // User requested "delete" functionality mainly.
    // Let's reuse the modal logic but show it as "Details".
    setFormData({
        resourceId: res.resourceId,
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        requester: res.requester,
        observation: res.observation || ''
    });
    setIsReservationModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If we are in "View Mode" (selectedReservation exists), maybe we don't save?
    // Or we treat it as an edit? For now, let's just handle Create. 
    // If selectedReservation exists, we block creation to avoid duplicates or implement Edit logic later.
    if (selectedReservation) {
        alert("Edição não suportada ainda. Exclua e crie novamente.");
        return;
    }

    const resource = equipmentList.find(e => e.id === formData.resourceId);

    try {
      await reservationService.createReservation({
        resourceId: formData.resourceId,
        resourceName: resource?.name || 'Desconhecido',
        type: 'workshop',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester,
        observation: formData.observation
      });
      alert("Reserva realizada com sucesso!");
      loadData();
      setIsReservationModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Delete Logic ---
  const requestDelete = () => {
    if (!selectedReservation) return;
    setItemToDelete(selectedReservation.id);
    setDeletePassword('');
    setPasswordError(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePassword !== MASTER_PASSWORD) {
        setPasswordError(true);
        return;
    }
    if (!itemToDelete) return;

    try {
      setReservations(prev => prev.filter(r => r.id !== itemToDelete));
      setShowDeleteConfirm(false);
      setIsReservationModalOpen(false); // Close details modal
      await reservationService.deleteReservation(itemToDelete);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert("Erro ao excluir. Tente novamente.");
      loadData();
    }
  };

  // Helper for Header Date Range
  const getWeekRangeString = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.getDate()} ${start.toLocaleDateString('pt-BR', {month:'short'})} - ${end.getDate()} ${end.toLocaleDateString('pt-BR', {month:'short'})}`;
  };

  return (
    <div className="p-4 md:p-8 h-screen flex flex-col">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Oficina Mecânica</h1>
          <p className="text-slate-500 mt-1">Gestão visual de ocupação.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
             <button 
                onClick={() => openNewReservation()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <FaPlus /> Nova Reserva
            </button>

            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200 items-center">
                <button onClick={handlePrevWeek} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Anterior</button>
                <span className="px-2 py-1.5 font-bold text-slate-800 min-w-[140px] text-center border-x border-slate-100 flex flex-col justify-center leading-tight cursor-pointer hover:bg-slate-50" onClick={handleToday} title="Ir para Hoje">
                    <span className="text-xs text-slate-400 uppercase">Semana de</span>
                    <span>{getWeekRangeString()}</span>
                </span>
                <button onClick={handleNextWeek} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Próximo</button>
            </div>
        </div>
      </header>

      {loading ? <div className="text-center py-10">Carregando...</div> : (
        <>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100 w-fit">
                <FaInfoCircle className="text-blue-500" />
                <span>Clique em um espaço vazio para agendar. Clique em um bloco colorido para ver detalhes ou excluir.</span>
            </div>
            
            <div className="flex-1 overflow-hidden">
                <CalendarView 
                    currentDate={currentDate} 
                    onSlotClick={handleSlotClick} 
                    onEventClick={handleEventClick}
                    reservations={reservations}
                    themeColor="blue"
                />
            </div>
        </>
      )}

      {/* Reservation/Details Modal */}
      <Modal 
        isOpen={isReservationModalOpen} 
        onClose={() => setIsReservationModalOpen(false)} 
      >
        <div className="bg-white rounded-2xl overflow-hidden">
            <div className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2.5 rounded-lg shadow-lg shadow-blue-500/30">
                            <FaTools size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {selectedReservation ? 'Detalhes da Reserva' : 'Nova Reserva'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {selectedReservation ? 'Visualize ou exclua o agendamento.' : 'Preencha os dados para agendar.'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Delete Button (Only if viewing existing) */}
                    {selectedReservation && (
                         <button 
                            type="button" 
                            onClick={requestDelete} 
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold border border-transparent hover:border-red-100"
                        >
                            <FaTrash /> Excluir
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Read-only info if selected, else Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Equipamento</label>
                             {selectedReservation ? (
                                 <div className="p-3 bg-slate-100 rounded-lg text-slate-800 font-medium border border-slate-200">
                                     {selectedReservation.resourceName}
                                 </div>
                             ) : (
                                <select 
                                    required 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.resourceId}
                                    onChange={e => setFormData({...formData, resourceId: e.target.value})}
                                >
                                    <option value="">Selecione um equipamento...</option>
                                    {equipmentList.map(eq => (
                                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                                    ))}
                                </select>
                             )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Data</label>
                            <input 
                                type="date"
                                disabled={!!selectedReservation}
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Início</label>
                            <select 
                                disabled={!!selectedReservation}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                                value={formData.startTime}
                                onChange={e => setFormData({...formData, startTime: e.target.value})}
                            >
                            {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Fim</label>
                            <select 
                                disabled={!!selectedReservation}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                                value={formData.endTime}
                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                            >
                            {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Solicitante</label>
                        <input 
                            type="text" 
                            disabled={!!selectedReservation}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                            value={formData.requester}
                            onChange={e => setFormData({...formData, requester: e.target.value})}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Observações</label>
                        <input 
                            type="text" 
                            disabled={!!selectedReservation}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                            value={formData.observation}
                            onChange={e => setFormData({...formData, observation: e.target.value})}
                        />
                    </div>

                    {!selectedReservation && (
                        <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 text-sm uppercase tracking-wide">
                            Confirmar Reserva
                        </button>
                    )}
                </form>
            </div>
        </div>
      </Modal>

      {/* CUSTOM PASSWORD MODAL (Overlay) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900 bg-opacity-80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative transform scale-100">
                <div className="flex flex-col items-center text-center mb-4">
                    <div className="bg-red-100 text-red-600 p-3 rounded-full mb-3">
                        <FaExclamationTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
                    <p className="text-sm text-slate-500 mt-1">Digite a senha administrativa para remover este agendamento.</p>
                </div>

                <form onSubmit={confirmDelete}>
                    <div className="relative mb-4">
                        <span className="absolute left-3 top-3 text-slate-400">
                            <FaLock />
                        </span>
                        <input 
                            type="password" 
                            autoFocus
                            placeholder="Senha (1234)"
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none focus:ring-2 transition-all ${passwordError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 focus:ring-blue-500'}`}
                            value={deletePassword}
                            onChange={(e) => {
                                setDeletePassword(e.target.value);
                                setPasswordError(false);
                            }}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-500/20 transition-colors"
                        >
                            Excluir
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Workshop;