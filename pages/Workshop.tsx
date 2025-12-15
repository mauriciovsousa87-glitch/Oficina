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
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Password Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

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
      // Get ONLY active equipment for the workshop dropdown
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

  const openReservationModal = (date: Date) => {
    setSelectedDay(date);
    setFormData({
      resourceId: '',
      date: date.toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      requester: '',
      observation: ''
    });
    setIsDayModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    openReservationModal(date);
  };

  const handleNewReservationClick = () => {
    // Defaults to today
    openReservationModal(new Date());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.resourceId) return;

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
      // Keep modal open so user can see the new reservation
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 1. User clicks Trash -> Open Custom Password Modal
  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setDeletePassword('');
    setPasswordError(false);
    setShowDeleteConfirm(true);
  };

  // 2. User confirms inside the modal
  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deletePassword !== MASTER_PASSWORD) {
        setPasswordError(true);
        return;
    }

    if (!itemToDelete) return;

    try {
      // Optimistic Update
      setReservations(prev => prev.filter(r => r.id !== itemToDelete));
      
      // Close password modal
      setShowDeleteConfirm(false);
      
      // Perform deletion
      await reservationService.deleteReservation(itemToDelete);
      
      // Reload to ensure sync
      loadData();
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert("Erro ao excluir. Tente novamente.");
      loadData();
    }
  };

  const reservationMap = reservations.reduce((acc, curr) => {
    acc[curr.date] = (acc[curr.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selectedDayReservations = selectedDay 
    ? reservations.filter(r => r.date === selectedDay.toISOString().split('T')[0])
    : [];

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Oficina Mecânica</h1>
          <p className="text-slate-500 mt-1">Gestão de equipamentos fixos e reservas.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <button 
                onClick={handleNewReservationClick}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <FaPlus /> Nova Reserva
            </button>

            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Anterior</button>
                <span className="px-4 py-1.5 font-bold text-slate-800 min-w-[140px] text-center border-x border-slate-100 flex items-center justify-center">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Próximo</button>
            </div>
        </div>
      </header>

      {loading ? <div className="text-center py-10">Carregando...</div> : (
        <>
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 bg-blue-50 p-3 rounded border border-blue-100 w-fit">
                <FaInfoCircle className="text-blue-500" />
                <span>Clique em um dia no calendário para ver detalhes ou agendar.</span>
            </div>
            <CalendarView 
            currentDate={currentDate} 
            onDateClick={handleDayClick} 
            reservations={reservationMap}
            themeColor="blue"
            />
        </>
      )}

      {/* Main Detail Modal */}
      <Modal 
        isOpen={isDayModalOpen} 
        onClose={() => setIsDayModalOpen(false)} 
      >
        <div className="bg-white rounded-2xl overflow-hidden">
          
            {/* Header */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-600 text-white p-2.5 rounded-lg shadow-lg shadow-blue-500/30">
                        <FaTools size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Oficina Mecânica</h3>
                        <p className="text-sm text-slate-500">Gestão de equipamentos fixos.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 pt-0">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-inner mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-1 text-lg">
                        <FaPlus className="text-blue-600" size={14} /> Nova Reserva
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">Preencha os dados abaixo para bloquear o horário do equipamento.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Equipamento *</label>
                                <select 
                                    required 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all"
                                    value={formData.resourceId}
                                    onChange={e => setFormData({...formData, resourceId: e.target.value})}
                                >
                                    <option value="">Selecione um equipamento...</option>
                                    {equipmentList.map(eq => (
                                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Data *</label>
                                <input 
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Início *</label>
                                <select 
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                value={formData.startTime}
                                onChange={e => setFormData({...formData, startTime: e.target.value})}
                                required
                                >
                                <option value="">--:--</option>
                                {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Fim *</label>
                                <select 
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                value={formData.endTime}
                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                                required
                                >
                                <option value="">--:--</option>
                                {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Nome do Solicitante *</label>
                            <input 
                                type="text" 
                                required
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                placeholder="Nome completo"
                                value={formData.requester}
                                onChange={e => setFormData({...formData, requester: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Observações (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                placeholder="Ex: Manutenção, Peça U-20"
                                value={formData.observation}
                                onChange={e => setFormData({...formData, observation: e.target.value})}
                            />
                        </div>

                        <button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 text-sm uppercase tracking-wide">
                            Confirmar Reserva
                        </button>
                    </form>
                </div>

                {/* List Existing for that day */}
                {selectedDayReservations.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Agendamentos do dia ({selectedDayReservations.length})</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {selectedDayReservations.map(res => (
                                <div key={res.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{res.startTime} - {res.endTime}</span>
                                            <span className="text-blue-600 font-semibold text-sm">{res.resourceName}</span>
                                        </div>
                                        <div className="text-slate-500 text-xs flex items-center gap-1 pl-1">
                                            <span className="font-medium text-slate-600">{res.requester}</span>
                                            {res.observation && <span className="text-slate-400">• {res.observation}</span>}
                                        </div>
                                    </div>
                                    {/* Delete Trigger Button */}
                                    <button 
                                        type="button" 
                                        onClick={() => requestDelete(res.id)} 
                                        className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                                        title="Excluir Reserva"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                    <h3 className="text-lg font-bold text-slate-800">Autorização Necessária</h3>
                    <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita. Digite a senha administrativa para confirmar.</p>
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
                        {passwordError && (
                            <span className="text-xs text-red-500 font-bold mt-1 block text-left">Senha incorreta. Tente novamente.</span>
                        )}
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