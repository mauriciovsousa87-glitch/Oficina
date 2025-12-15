import React, { useState, useEffect } from 'react';
import { FaLayerGroup, FaTrash, FaPlus, FaInfoCircle, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Reservation } from '../types';
import * as reservationService from '../services/reservationService';

const Scaffolding: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Password Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [formData, setFormData] = useState({
    location: '',
    scaffoldType: 'assembly' as 'assembly' | 'disassembly',
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
      const allRes = await reservationService.getAllReservations();
      setReservations(allRes.filter(r => r.type === 'scaffolding'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  const openNewReservation = (date?: Date, time?: string) => {
    const d = date || new Date();
    let startT = time || '08:00';
    const hourIndex = HOURS.indexOf(startT);
    let endT = (hourIndex !== -1 && hourIndex < HOURS.length - 1) ? HOURS[hourIndex + 1] : HOURS[HOURS.length - 1];

    setFormData({
        location: '',
        scaffoldType: 'assembly',
        date: d.toISOString().split('T')[0],
        startTime: startT,
        endTime: endT,
        requester: '',
        observation: ''
    });
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, time: string) => {
    openNewReservation(date, time);
  };

  const handleEventClick = (res: Reservation) => {
    setSelectedReservation(res);
    setFormData({
        location: res.resourceName,
        scaffoldType: res.scaffoldingType || 'assembly',
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        requester: res.requester,
        observation: res.observation || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReservation) {
        alert("Edição não suportada. Exclua e crie novamente.");
        return;
    }
    if (!formData.date || !formData.location) return;

    try {
      await reservationService.createReservation({
        resourceId: formData.location.toLowerCase().replace(/\s/g, '-'), 
        resourceName: formData.location,
        type: 'scaffolding',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester,
        scaffoldingType: formData.scaffoldType,
        observation: formData.observation
      });
      alert("Solicitação registrada!");
      loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const requestDelete = () => {
      if (!selectedReservation) return;
      setItemToDelete(selectedReservation.id);
      setDeletePassword('');
      setShowDeleteConfirm(true);
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePassword !== MASTER_PASSWORD) {
        setPasswordError(true);
        return;
    }
    if (!itemToDelete) return;
    
    await reservationService.deleteReservation(itemToDelete);
    setShowDeleteConfirm(false);
    setIsModalOpen(false);
    loadData();
  };

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
    <div className="p-4 md:p-8 h-screen flex flex-col bg-orange-50/30">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Andaimes</h1>
          <p className="text-orange-600 mt-1 font-medium">Cronograma de Montagem/Desmontagem</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
             <button 
                onClick={() => openNewReservation()}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-orange-700 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <FaPlus /> Nova Solicitação
            </button>

            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200 items-center">
                <button onClick={handlePrevWeek} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Anterior</button>
                <span className="px-2 py-1.5 font-bold text-slate-800 min-w-[140px] text-center border-x border-slate-100 flex flex-col justify-center leading-tight">
                    <span className="text-xs text-slate-400 uppercase">Semana de</span>
                    <span className="text-orange-600">{getWeekRangeString()}</span>
                </span>
                <button onClick={handleNextWeek} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Próximo</button>
            </div>
        </div>
      </header>

      {loading ? <div>Carregando...</div> : (
        <>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 bg-orange-50 p-2 rounded border border-orange-100 w-fit">
                <FaInfoCircle className="text-orange-500" />
                <span>Clique nos espaços para agendar.</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <CalendarView 
                currentDate={currentDate} 
                onSlotClick={handleSlotClick} 
                onEventClick={handleEventClick}
                reservations={reservations}
                themeColor="orange"
                />
            </div>
        </>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      >
        <div className="bg-white rounded-2xl overflow-hidden">
           <div className="p-6 pb-4 bg-orange-50 border-b border-orange-100">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                        <div className="bg-orange-500 text-white p-2.5 rounded-lg shadow-lg shadow-orange-500/30">
                            <FaLayerGroup size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Andaimes</h3>
                            <p className="text-sm text-slate-500">{selectedReservation ? 'Detalhes' : 'Nova Solicitação'}</p>
                        </div>
                   </div>
                   {selectedReservation && (
                        <button 
                           type="button" 
                           onClick={requestDelete} 
                           className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                       >
                           <FaTrash /> Excluir
                       </button>
                   )}
               </div>
          </div>

          <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Local / Setor</label>
                            <input 
                                type="text" 
                                required
                                disabled={!!selectedReservation}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-50"
                                placeholder="Ex: Torre de Resfriar"
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Tipo de Serviço</label>
                            <select 
                                disabled={!!selectedReservation}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-50"
                                value={formData.scaffoldType}
                                onChange={e => setFormData({...formData, scaffoldType: e.target.value as any})}
                            >
                                <option value="assembly">Montagem</option>
                                <option value="disassembly">Desmontagem</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Data</label>
                            <input 
                                type="date"
                                required
                                disabled={!!selectedReservation}
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                            />
                        </div>
                        <div className="col-span-1">
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
                        <div className="col-span-1">
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
                            required
                            disabled={!!selectedReservation}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                            value={formData.requester}
                            onChange={e => setFormData({...formData, requester: e.target.value})}
                        />
                    </div>
                    
                    {!selectedReservation && (
                        <button type="submit" className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-orange-500/30 text-sm">
                            Agendar
                        </button>
                    )}
                </form>
          </div>
        </div>
      </Modal>

      {/* Password Modal (Reused) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900 bg-opacity-80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                 <div className="flex flex-col items-center text-center mb-4">
                    <div className="bg-red-100 text-red-600 p-3 rounded-full mb-3">
                        <FaExclamationTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
                </div>
                <form onSubmit={confirmDelete}>
                    <input 
                        type="password" 
                        autoFocus
                        placeholder="Senha (1234)"
                        className="w-full mb-4 pl-4 pr-4 py-2.5 border rounded-lg outline-none focus:ring-2"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Scaffolding;