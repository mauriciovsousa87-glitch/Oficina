import React, { useState, useEffect } from 'react';
import { FaLayerGroup, FaPlus, FaTrash } from 'react-icons/fa';
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
    startTime: '08:00',
    endTime: '12:00',
    requester: ''
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

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setIsDayModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !formData.location) return;

    const dateStr = selectedDay.toISOString().split('T')[0];

    try {
      // For scaffolding, resourceId is the location name itself to prevent 2 teams at same spot
      await reservationService.createReservation({
        resourceId: formData.location.toLowerCase().replace(/\s/g, '-'), 
        resourceName: formData.location,
        type: 'scaffolding',
        date: dateStr,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester,
        scaffoldingType: formData.scaffoldType
      });
      alert("Solicitação de andaime registrada!");
      setFormData({ location: '', scaffoldType: 'assembly', startTime: '08:00', endTime: '12:00', requester: '' });
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
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Andaimes</h1>
          <p className="text-orange-600 mt-1 font-medium">Gestão de Montagem e Desmontagem</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="px-4 py-2 bg-white border rounded shadow hover:bg-slate-50">Anterior</button>
            <span className="px-4 py-2 font-bold bg-white border rounded min-w-[150px] text-center text-orange-600">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="px-4 py-2 bg-white border rounded shadow hover:bg-slate-50">Próximo</button>
        </div>
      </header>

      {loading ? <div>Carregando...</div> : (
        <CalendarView 
          currentDate={currentDate} 
          onDateClick={handleDayClick} 
          reservations={reservationMap}
          themeColor="orange"
        />
      )}

      <Modal 
        isOpen={isDayModalOpen} 
        onClose={() => setIsDayModalOpen(false)} 
        title={`Andaimes: ${selectedDay?.toLocaleDateString('pt-BR')}`}
      >
        <div className="space-y-6">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {selectedDayReservations.length === 0 ? (
              <p className="text-slate-400 text-center italic">Nenhum agendamento.</p>
            ) : (
              selectedDayReservations.map(res => (
                <div key={res.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{res.resourceName}</span>
                    <span className={`block text-xs font-bold uppercase ${res.scaffoldingType === 'assembly' ? 'text-green-600' : 'text-red-600'}`}>
                        {res.scaffoldingType === 'assembly' ? 'Montagem' : 'Desmontagem'}
                    </span>
                    <span className="text-slate-500 text-xs block">{res.startTime} - {res.endTime} ({res.requester})</span>
                  </div>
                  <button onClick={() => handleDelete(res.id)} className="text-red-400 hover:text-red-600">
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>

          <hr className="border-slate-200" />

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                 <FaLayerGroup className="text-orange-500" />
                 <h4 className="font-bold text-slate-700">Novo Agendamento</h4>
             </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local / Área</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: Setor B, Caldeira 2"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Serviço</label>
               <div className="flex gap-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                        type="radio" 
                        name="scaffoldType" 
                        checked={formData.scaffoldType === 'assembly'} 
                        onChange={() => setFormData({...formData, scaffoldType: 'assembly'})}
                        className="text-orange-500 focus:ring-orange-500"
                        />
                       <span className="text-sm">Montagem</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                        type="radio" 
                        name="scaffoldType" 
                        checked={formData.scaffoldType === 'disassembly'} 
                        onChange={() => setFormData({...formData, scaffoldType: 'disassembly'})}
                        className="text-orange-500 focus:ring-orange-500"
                        />
                       <span className="text-sm">Desmontagem</span>
                   </label>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.startTime}
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                >
                  {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fim</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.endTime}
                  onChange={e => setFormData({...formData, endTime: e.target.value})}
                >
                   {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Encarregado</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Nome"
                value={formData.requester}
                onChange={e => setFormData({...formData, requester: e.target.value})}
              />
            </div>

            <button type="submit" className="w-full bg-orange-500 text-white font-bold py-2 rounded hover:bg-orange-600 transition-colors">
              Agendar Andaime
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Scaffolding;
