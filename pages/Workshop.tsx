import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaTrash } from 'react-icons/fa';
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
  
  // Form State
  const [formData, setFormData] = useState({
    resourceId: '',
    startTime: '08:00',
    endTime: '09:00',
    requester: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const equip = await reservationService.getEquipment();
      setEquipmentList(equip.filter(e => e.type !== 'vehicle')); // Assuming workshop uses machines/tools
      
      const allRes = await reservationService.getAllReservations();
      // Filter for current month visual
      setReservations(allRes.filter(r => r.type === 'workshop'));
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
    if (!selectedDay || !formData.resourceId) return;

    const dateStr = selectedDay.toISOString().split('T')[0];
    const resource = equipmentList.find(e => e.id === formData.resourceId);

    try {
      await reservationService.createReservation({
        resourceId: formData.resourceId,
        resourceName: resource?.name || 'Desconhecido',
        type: 'workshop',
        date: dateStr,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester
      });
      alert("Reserva realizada com sucesso!");
      setFormData({ resourceId: '', startTime: '08:00', endTime: '09:00', requester: '' });
      loadData();
      setIsDayModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const pwd = prompt("Digite a senha mestre para cancelar:");
    if (pwd === MASTER_PASSWORD) {
      await reservationService.deleteReservation(id);
      loadData();
      // If no reservations left for the day, maybe close modal or refresh
      const dateStr = selectedDay?.toISOString().split('T')[0];
      const resForDay = reservations.filter(r => r.date === dateStr && r.id !== id);
      if (resForDay.length === 0) setIsDayModalOpen(false);
    } else {
      alert("Senha incorreta.");
    }
  };

  // Compute map for calendar
  const reservationMap = reservations.reduce((acc, curr) => {
    acc[curr.date] = (acc[curr.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selectedDayReservations = selectedDay 
    ? reservations.filter(r => r.date === selectedDay.toISOString().split('T')[0])
    : [];

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Oficina</h1>
          <p className="text-slate-500 mt-1">Gerencie o uso de equipamentos e espaços</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="px-4 py-2 bg-white border rounded shadow hover:bg-slate-50">Anterior</button>
            <span className="px-4 py-2 font-bold bg-slate-100 rounded min-w-[150px] text-center">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="px-4 py-2 bg-white border rounded shadow hover:bg-slate-50">Próximo</button>
        </div>
      </header>

      {loading ? <div className="text-center py-10">Carregando...</div> : (
        <CalendarView 
          currentDate={currentDate} 
          onDateClick={handleDayClick} 
          reservations={reservationMap}
          themeColor="blue"
        />
      )}

      {/* Detail Modal */}
      <Modal 
        isOpen={isDayModalOpen} 
        onClose={() => setIsDayModalOpen(false)} 
        title={`Reservas: ${selectedDay?.toLocaleDateString('pt-BR')}`}
      >
        <div className="space-y-6">
          {/* List Existing */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {selectedDayReservations.length === 0 ? (
              <p className="text-slate-400 text-center italic">Nenhuma reserva para este dia.</p>
            ) : (
              selectedDayReservations.map(res => (
                <div key={res.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-700 block">{res.startTime} - {res.endTime}</span>
                    <span className="text-blue-600 text-sm font-medium">{res.resourceName}</span>
                    <span className="text-slate-500 text-xs block">Por: {res.requester}</span>
                  </div>
                  <button onClick={() => handleDelete(res.id)} className="text-red-400 hover:text-red-600">
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Add New Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <FaPlus className="text-blue-500" size={12} /> Nova Reserva
            </h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipamento</label>
              <select 
                required 
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.resourceId}
                onChange={e => setFormData({...formData, resourceId: e.target.value})}
              >
                <option value="">Selecione...</option>
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Solicitante</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nome do responsável"
                value={formData.requester}
                onChange={e => setFormData({...formData, requester: e.target.value})}
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors">
              Confirmar Reserva
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Workshop;
