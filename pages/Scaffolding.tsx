import React, { useState, useEffect } from 'react';
import { FaLayerGroup, FaTrash, FaPlus, FaInfoCircle } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Reservation } from '../types';
import * as reservationService from '../services/reservationService';

const Scaffolding: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
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

  const openReservationModal = (date: Date) => {
    setSelectedDay(date);
    setFormData({
        location: '',
        scaffoldType: 'assembly',
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
      openReservationModal(new Date());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      alert("Solicitação de andaime registrada!");
      loadData();
      setIsDayModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const pwd = prompt("Senha mestre:");
    if (pwd === MASTER_PASSWORD) {
      await reservationService.deleteReservation(id);
      loadData();
    } else {
      alert("Senha incorreta.");
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
    <div className="p-8 h-screen overflow-y-auto bg-orange-50/30">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Andaimes</h1>
          <p className="text-orange-600 mt-1 font-medium">Gestão de Montagem e Desmontagem</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <button 
                onClick={handleNewReservationClick}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-orange-700 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <FaPlus /> Nova Solicitação
            </button>

            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Anterior</button>
                <span className="px-4 py-1.5 font-bold text-slate-800 min-w-[140px] text-center border-x border-slate-100 flex items-center justify-center text-orange-600">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Próximo</button>
            </div>
        </div>
      </header>

      {loading ? <div>Carregando...</div> : (
        <>
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 bg-orange-50 p-3 rounded border border-orange-100 w-fit">
                <FaInfoCircle className="text-orange-500" />
                <span>Clique em um dia no calendário para ver detalhes ou agendar.</span>
            </div>
            <CalendarView 
            currentDate={currentDate} 
            onDateClick={handleDayClick} 
            reservations={reservationMap}
            themeColor="orange"
            />
        </>
      )}

      <Modal 
        isOpen={isDayModalOpen} 
        onClose={() => setIsDayModalOpen(false)} 
      >
        <div className="bg-white rounded-2xl overflow-hidden">
           {/* Header mimicking the print */}
           <div className="p-6 pb-4">
               <div className="flex items-center gap-3 mb-2">
                    <div className="bg-orange-500 text-white p-2.5 rounded-lg shadow-lg shadow-orange-500/30">
                        <FaLayerGroup size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Reserva de Andaimes</h3>
                        <p className="text-sm text-slate-500">Agendamento de montagem e desmontagem.</p>
                    </div>
               </div>
          </div>

          <div className="p-6 pt-0">
            <div className="bg-white p-1 mb-6">
                <h4 className="font-bold text-slate-800 text-lg mb-4">Novo Agendamento</h4>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Local / Setor *</label>
                            <input 
                                type="text" 
                                required
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                placeholder="Ex: Torre de Resfriar"
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Tipo de Serviço</label>
                            <select 
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                value={formData.scaffoldType}
                                onChange={e => setFormData({...formData, scaffoldType: e.target.value as any})}
                            >
                                <option value="assembly">Montagem</option>
                                <option value="disassembly">Desmontagem</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Data *</label>
                            <input 
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Início *</label>
                            <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                            value={formData.startTime}
                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                            required
                            >
                            <option value="">--:--</option>
                            {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Fim *</label>
                            <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                            value={formData.endTime}
                            onChange={e => setFormData({...formData, endTime: e.target.value})}
                            required
                            >
                            <option value="">--:--</option>
                            {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Solicitante *</label>
                            <input 
                                type="text" 
                                required
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                placeholder="Nome"
                                value={formData.requester}
                                onChange={e => setFormData({...formData, requester: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Obs</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                value={formData.observation}
                                onChange={e => setFormData({...formData, observation: e.target.value})}
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-orange-500/30 text-sm">
                    Agendar
                    </button>
                </form>
            </div>

            {/* List existing */}
            {selectedDayReservations.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Agendamentos do dia ({selectedDayReservations.length})</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {selectedDayReservations.map(res => (
                            <div key={res.id} className="flex justify-between items-center bg-orange-50/50 p-3 rounded-lg border border-orange-100 shadow-sm">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${res.scaffoldingType === 'assembly' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {res.scaffoldingType === 'assembly' ? 'MONTAGEM' : 'DESMONTAGEM'}
                                    </span>
                                    <span className="font-bold text-slate-800 text-sm">{res.resourceName}</span>
                                </div>
                                <div className="text-slate-500 text-xs pl-1">
                                    {res.startTime}-{res.endTime} | <span className="font-medium">{res.requester}</span> {res.observation && `(${res.observation})`}
                                </div>
                            </div>
                            <button onClick={() => handleDelete(res.id)} className="text-red-300 hover:text-red-500 p-2">
                                <FaTrash size={14} />
                            </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Scaffolding;