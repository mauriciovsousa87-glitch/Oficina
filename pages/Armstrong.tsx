
import React, { useState, useEffect, useMemo } from 'react';
import { FaFire, FaPlus, FaTrash, FaMoneyBillWave, FaInfoCircle, FaCalendarAlt, FaListUl, FaCheck, FaClock, FaExclamationCircle, FaChartLine, FaCoins } from 'react-icons/fa';
import CalendarView from '../components/CalendarView';
import Modal from '../components/Modal';
import { HOURS, MASTER_PASSWORD } from '../constants';
import { Equipment, Reservation, VaporBacklog, PCMArea } from '../types';
import * as reservationService from '../services/reservationService';

const PCM_OPTIONS = [
  'L501', 'L502', 'L503', 'L511', 'L512', 'L561', 'L562', 'Brassagem 1', 'Brassagem 2'
];

const Armstrong: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'backlog'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [backlog, setBacklog] = useState<VaporBacklog[]>([]);
  const [pcmAreas, setPcmAreas] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBacklogModalOpen, setIsBacklogModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedBacklog, setSelectedBacklog] = useState<VaporBacklog | null>(null);
  
  const [formData, setFormData] = useState({
    resourceId: '',
    customResourceName: '',
    date: '',
    startTime: '',
    endTime: '',
    requester: '',
    observation: '',
    impactValue: 0,
    impactUnit: 'MJ/hl' as 'MJ' | 'vapor' | 'agua' | 'MJ/hl' | 'R$' | 'ton'
  });

  const [backlogFormData, setBacklogFormData] = useState<Omit<VaporBacklog, 'id' | 'createdAt'>>({
    area: '',
    subArea: '',
    problem: '',
    impactValue: 0,
    investment: 0,
    status: 'not_programmed',
    executionDate: '',
    startTime: '08:00',
    endTime: '09:00'
  });

  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBacklogDeleteConfirm, setShowBacklogDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allEquip = await reservationService.getEquipment(true);
      setEquipmentList(allEquip.filter(e => e.type === 'steam'));
      
      const allRes = await reservationService.getAllReservations();
      const armstrongRes = allRes.filter(r => r.type === 'armstrong');

      const backlogData = await reservationService.getVaporBacklog();
      setBacklog(backlogData);

      // Convert programmed backlog items to reservations for the calendar
      const backlogAsReservations: Reservation[] = backlogData
        .filter(item => item.status === 'programmed' && item.executionDate && item.startTime && item.endTime)
        .map(item => ({
          id: `backlog-${item.id}`,
          resourceId: `backlog-${item.id}`,
          resourceName: `[BACKLOG] ${item.area}`,
          type: 'armstrong',
          date: item.executionDate!,
          startTime: item.startTime!,
          endTime: item.endTime!,
          requester: 'Backlog',
          observation: item.problem,
          impactValue: item.impactValue,
          impactUnit: 'MJ/hl',
          status: 'pending'
        }));

      setReservations([...armstrongRes, ...backlogAsReservations]);

      // Load PCM areas for the current week
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const pcmData: Record<string, string[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const pcm = await reservationService.getPCMAreas(dateStr);
        if (pcm) pcmData[dateStr] = pcm.areas;
      }
      setPcmAreas(pcmData);
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
      customResourceName: '',
      date: d.toISOString().split('T')[0],
      startTime: startT,
      endTime: endT,
      requester: '',
      observation: '',
      impactValue: 0,
      impactUnit: 'MJ/hl'
    });
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, time: string) => openNewReservation(date, time);
  const handleEventClick = (res: Reservation) => {
    if (res.id.startsWith('backlog-')) {
      const backlogId = res.id.replace('backlog-', '');
      const item = backlog.find(b => b.id === backlogId);
      if (item) {
        setSelectedBacklog(item);
        setBacklogFormData({ ...item });
        setIsBacklogModalOpen(true);
        return;
      }
    }
    setSelectedReservation(res);
    setFormData({
        resourceId: res.resourceId,
        customResourceName: res.resourceName || '',
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        requester: res.requester,
        observation: res.observation || '',
        impactValue: res.impactValue || 0,
        impactUnit: res.impactUnit || 'MJ/hl'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReservation) return alert("Edição não suportada.");
    
    let resourceName = formData.customResourceName;
    let resourceId = formData.resourceId;

    if (resourceId) {
        const resource = equipmentList.find(m => m.id === resourceId);
        resourceName = resource?.name || 'Equipamento';
    } else if (!resourceName) {
        alert("Selecione um equipamento ou digite o nome da linha.");
        return;
    } else {
        resourceId = `custom-${Date.now()}`;
    }
    
    try {
      await reservationService.createReservation({
        resourceId: resourceId,
        resourceName: resourceName,
        type: 'armstrong',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requester: formData.requester,
        observation: formData.observation,
        impactValue: Number(formData.impactValue),
        impactUnit: formData.impactUnit,
        status: 'pending'
      });
      alert("Manutenção Agendada!");
      loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || JSON.stringify(err));
    }
  };

  const handleBacklogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reservationService.saveVaporBacklog({
        ...backlogFormData,
        id: selectedBacklog?.id || '',
      } as VaporBacklog);
      alert("Backlog salvo!");
      loadData();
      setIsBacklogModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePCMChange = async (dateStr: string, area: string) => {
    const current = pcmAreas[dateStr] || [];
    let updated;
    if (current.includes(area)) {
      updated = current.filter(a => a !== area);
    } else {
      if (current.length >= 3) {
        alert("Máximo de 3 áreas em PCM por dia.");
        return;
      }
      updated = [...current, area];
    }
    
    const newPcmAreas = { ...pcmAreas, [dateStr]: updated };
    setPcmAreas(newPcmAreas);
    
    try {
      await reservationService.savePCMArea({
        id: '',
        date: dateStr,
        areas: updated
      });
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

  const confirmBacklogDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePassword !== MASTER_PASSWORD) return alert("Senha incorreta");
    if (selectedBacklog) {
        try {
            await reservationService.deleteVaporBacklog(selectedBacklog.id);
            setShowBacklogDeleteConfirm(false);
            setIsBacklogModalOpen(false);
            loadData();
            alert("Pendência excluída com sucesso!");
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        }
    }
  };

  const backlogMacros = useMemo(() => {
    const pendingItems = backlog.filter(item => item.status !== 'realized');
    return {
      count: pendingItems.length,
      totalGain: pendingItems.reduce((acc, item) => acc + (item.impactValue || 0), 0),
      totalInvestment: pendingItems.reduce((acc, item) => acc + (item.investment || 0), 0)
    };
  }, [backlog]);

  const sortedBacklog = [...backlog].sort((a, b) => {
    if (a.status === 'realized' && b.status !== 'realized') return 1;
    if (a.status !== 'realized' && b.status === 'realized') return -1;
    return b.impactValue - a.impactValue;
  });

  const getStatusColor = (item: VaporBacklog) => {
    if (item.status === 'realized') return 'bg-green-100 border-green-500 text-green-800';
    if (item.status === 'programmed') return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    return 'bg-red-100 border-red-500 text-red-800';
  };

  return (
    <div className="p-8 h-screen flex flex-col bg-rose-50/30">
        <header className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <FaFire className="text-rose-600" /> Armstrong (Vapor)
                    </h1>
                    <p className="text-rose-700 mt-1">Gestão de purgadores e sistemas de vapor.</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'calendar' ? (
                        <>
                            <button onClick={() => openNewReservation()} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-bold shadow flex gap-2 items-center">
                                <FaPlus /> Nova Manutenção
                            </button>
                            <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                <button onClick={handlePrevWeek} className="px-3 hover:bg-slate-100 rounded text-sm">Anterior</button>
                                <button onClick={handleNextWeek} className="px-3 hover:bg-slate-100 rounded text-sm">Próximo</button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => {
                            setSelectedBacklog(null);
                            setBacklogFormData({ area: '', subArea: '', problem: '', impactValue: 0, investment: 0, status: 'not_programmed', executionDate: '', startTime: '08:00', endTime: '09:00' });
                            setIsBacklogModalOpen(true);
                        }} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-bold shadow flex gap-2 items-center">
                            <FaPlus /> Novo Backlog
                        </button>
                    )}
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('calendar')}
                    className={`px-6 py-2 font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FaCalendarAlt /> Calendário
                </button>
                <button 
                    onClick={() => setActiveTab('backlog')}
                    className={`px-6 py-2 font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'backlog' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FaListUl /> Backlog
                </button>
            </div>
        </header>

        {loading ? <div className="flex-1 flex items-center justify-center">Carregando...</div> : (
             <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'calendar' ? (
                    <>
                        <div className="bg-white p-4 mb-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <FaClock className="text-rose-500" /> Áreas em PCM (Parada de Manutenção)
                            </h3>
                            <div className="flex">
                                {/* Spacer to align with calendar time column (w-16 = 64px) */}
                                <div className="w-16 flex-shrink-0"></div>
                                <div className="grid grid-cols-7 gap-2 flex-1">
                                    {Array.from({ length: 7 }, (_, i) => {
                                        const d = new Date(currentDate);
                                        d.setDate(currentDate.getDate() - currentDate.getDay() + i);
                                        const dateStr = d.toISOString().split('T')[0];
                                        const selected = pcmAreas[dateStr] || [];
                                        
                                        return (
                                            <div key={dateStr} className="flex flex-col gap-1">
                                                <div className="text-[10px] font-bold text-slate-400 text-center uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</div>
                                                <div className="relative group">
                                                    <div className="p-2 border rounded bg-slate-50 text-xs min-h-[60px] flex flex-col gap-1">
                                                        {selected.length === 0 ? <span className="text-slate-300 italic">Nenhuma parada</span> : selected.map(a => (
                                                            <span key={a} className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded flex justify-between items-center font-bold">
                                                                {a} <button onClick={() => handlePCMChange(dateStr, a)} className="hover:text-rose-900 ml-1">×</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="absolute top-full left-0 w-48 bg-white border shadow-xl rounded-lg z-50 hidden group-hover:block p-2">
                                                        <p className="text-[10px] font-bold text-slate-500 mb-1">Selecionar Áreas (Máx 3):</p>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {PCM_OPTIONS.map(opt => (
                                                                <button 
                                                                    key={opt}
                                                                    onClick={() => handlePCMChange(dateStr, opt)}
                                                                    className={`text-[9px] p-1 rounded text-left ${selected.includes(opt) ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
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
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {/* Macro Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                                    <FaListUl size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendências em Aberto</p>
                                    <p className="text-2xl font-bold text-slate-800">{backlogMacros.count}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <FaChartLine size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ganho Total (MJ/hl)</p>
                                    <p className="text-2xl font-bold text-slate-800">{backlogMacros.totalGain.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                    <FaCoins size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nível de Investimento</p>
                                    <p className="text-2xl font-bold text-slate-800">R$ {backlogMacros.totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {sortedBacklog.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => {
                                        setSelectedBacklog(item);
                                        setBacklogFormData({ ...item });
                                        setIsBacklogModalOpen(true);
                                    }}
                                    className={`p-4 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${getStatusColor(item)}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.area} / {item.subArea}</span>
                                        {item.status === 'realized' && <FaCheck className="text-green-600" />}
                                        {item.status === 'programmed' && <FaClock className="text-yellow-600" />}
                                        {item.status === 'not_programmed' && <FaExclamationCircle className="text-red-600" />}
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">{item.problem}</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold">Impacto</p>
                                            <p className="font-bold text-rose-600">{item.impactValue} MJ/hl</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold">Investimento</p>
                                            <p className="font-bold">R$ {item.investment.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {item.executionDate && (
                                        <div className="mt-3 pt-3 border-t border-black/5 text-[10px] font-bold flex items-center gap-1">
                                            <FaCalendarAlt /> Execução: {new Date(item.executionDate).toLocaleDateString('pt-BR')} {item.startTime}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {backlog.length === 0 && (
                            <div className="text-center py-20 text-slate-400">
                                <FaListUl size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhuma pendência no backlog.</p>
                            </div>
                        )}
                    </div>
                )}
             </div>
        )}

        {/* Reservation Modal */}
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
                        <div className="flex gap-2">
                            <select className="flex-1 p-2 border rounded" value={formData.resourceId} onChange={e => setFormData({...formData, resourceId: e.target.value})} disabled={!!selectedReservation}>
                                <option value="">Outro (Digitar abaixo)...</option>
                                {equipmentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        {!formData.resourceId && (
                            <input 
                                type="text" 
                                placeholder="Nome da linha ou purgador"
                                className="w-full mt-2 p-2 border rounded text-sm"
                                value={formData.customResourceName}
                                onChange={e => setFormData({...formData, customResourceName: e.target.value})}
                                disabled={!!selectedReservation}
                            />
                        )}
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
                        <label className="block text-xs font-bold text-green-600 mb-1 flex items-center gap-1"><FaMoneyBillWave/> Impacto da Perda</label>
                        <div className="flex gap-2">
                            <input type="number" step="0.01" className="flex-1 p-2 border border-green-200 bg-green-50 rounded" value={formData.impactValue} onChange={e => setFormData({...formData, impactValue: Number(e.target.value)})} disabled={!!selectedReservation} placeholder="0.00" />
                            <select className="w-24 p-2 border rounded bg-white" value={formData.impactUnit} onChange={e => setFormData({...formData, impactUnit: e.target.value as any})} disabled={!!selectedReservation}>
                                <option value="MJ/hl">MJ/hl</option>
                                <option value="R$">R$</option>
                                <option value="ton">ton</option>
                            </select>
                        </div>
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

        {/* Backlog Modal */}
        <Modal isOpen={isBacklogModalOpen} onClose={() => {
            setIsBacklogModalOpen(false);
            setShowBacklogDeleteConfirm(false);
            setDeletePassword('');
        }}>
            <div className="p-6 bg-white rounded-lg">
                <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FaListUl className="text-rose-500" /> {selectedBacklog ? 'Editar Pendência' : 'Novo Backlog de Vapor'}
                </h2>
                
                {selectedBacklog && !showBacklogDeleteConfirm && (
                    <button onClick={() => setShowBacklogDeleteConfirm(true)} className="text-red-500 text-sm font-bold flex gap-1 items-center mb-4"><FaTrash/> Excluir Pendência</button>
                )}

                {!showBacklogDeleteConfirm ? (
                <form onSubmit={handleBacklogSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Área</label>
                            <input type="text" required className="w-full p-2 border rounded" value={backlogFormData.area} onChange={e => setBacklogFormData({...backlogFormData, area: e.target.value})} placeholder="Ex: Brassagem" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Subárea</label>
                            <input type="text" required className="w-full p-2 border rounded" value={backlogFormData.subArea} onChange={e => setBacklogFormData({...backlogFormData, subArea: e.target.value})} placeholder="Ex: Filtro" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Problema</label>
                        <textarea required className="w-full p-2 border rounded h-24" value={backlogFormData.problem} onChange={e => setBacklogFormData({...backlogFormData, problem: e.target.value})} placeholder="Descreva a falha ou melhoria..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-rose-600 mb-1">Impacto (MJ/hl)</label>
                            <input type="number" required step="0.01" className="w-full p-2 border border-rose-100 bg-rose-50 rounded" value={backlogFormData.impactValue} onChange={e => setBacklogFormData({...backlogFormData, impactValue: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Investimento (R$)</label>
                            <input type="number" required step="0.01" className="w-full p-2 border rounded" value={backlogFormData.investment} onChange={e => setBacklogFormData({...backlogFormData, investment: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data Execução</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border rounded" 
                                value={backlogFormData.executionDate} 
                                onChange={e => {
                                    const newDate = e.target.value;
                                    let newStatus = backlogFormData.status;
                                    if (newStatus !== 'realized') {
                                        newStatus = newDate ? 'programmed' : 'not_programmed';
                                    }
                                    setBacklogFormData({...backlogFormData, executionDate: newDate, status: newStatus});
                                }} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
                            <select className="w-full p-2 border rounded" value={backlogFormData.startTime} onChange={e => setBacklogFormData({...backlogFormData, startTime: e.target.value})}>
                                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Fim</label>
                            <select className="w-full p-2 border rounded" value={backlogFormData.endTime} onChange={e => setBacklogFormData({...backlogFormData, endTime: e.target.value})}>
                                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {selectedBacklog && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded border border-slate-200">
                            <input 
                                type="checkbox" 
                                id="isRealized"
                                checked={backlogFormData.status === 'realized'} 
                                onChange={e => setBacklogFormData({...backlogFormData, status: e.target.checked ? 'realized' : (backlogFormData.executionDate ? 'programmed' : 'not_programmed')})}
                            />
                            <label htmlFor="isRealized" className="text-sm font-bold text-slate-700">Marcar como Realizado</label>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setIsBacklogModalOpen(false)} className="flex-1 bg-slate-100 py-2 rounded font-bold">Cancelar</button>
                        <button type="submit" className="flex-1 bg-rose-600 text-white py-2 rounded font-bold shadow-lg shadow-rose-500/30">Salvar</button>
                    </div>
                </form>
                ) : (
                    <form onSubmit={confirmBacklogDelete} className="bg-red-50 p-4 rounded border border-red-100">
                        <p className="text-red-700 text-xs font-bold mb-2">Confirme a exclusão com a senha mestre:</p>
                        <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="w-full p-2 border rounded mb-2" placeholder="Senha mestre" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowBacklogDeleteConfirm(false)} className="flex-1 bg-slate-200 py-2 rounded">Cancelar</button>
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