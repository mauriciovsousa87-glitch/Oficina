
import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaChargingStation, FaCubes, FaPlus, FaTrash, FaExclamationTriangle, FaCheckCircle, FaClock, FaLock } from 'react-icons/fa';
import Modal from '../components/Modal';
import { SafetyRecord } from '../types';
import * as reservationService from '../services/reservationService';
import { MASTER_PASSWORD } from '../constants';

interface SafetyManagementProps {
  nrType: 'NR10' | 'NR13';
}

const SafetyManagement: React.FC<SafetyManagementProps> = ({ nrType }) => {
  const [records, setRecords] = useState<SafetyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SafetyRecord>>({
    assetName: '', description: '', status: 'compliant', responsible: '', lastInspection: '', nextInspection: ''
  });
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  const isNR10 = nrType === 'NR10';
  const Icon = isNR10 ? FaChargingStation : FaCubes;
  const themeColor = isNR10 ? 'text-amber-600' : 'text-indigo-600';
  const bgColor = isNR10 ? 'bg-amber-50' : 'bg-indigo-50';
  const btnColor = isNR10 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700';

  useEffect(() => {
    loadData();
  }, [nrType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reservationService.getSafetyRecords(nrType);
      setRecords(data.sort((a,b) => new Date(a.nextInspection).getTime() - new Date(b.nextInspection).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reservationService.saveSafetyRecord({
        ...formData as SafetyRecord,
        nrType,
        id: ''
      });
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      alert("Erro ao salvar registro de segurança.");
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePassword !== MASTER_PASSWORD) return alert("Senha administrativa incorreta.");
    if (deleteId) {
      await reservationService.deleteSafetyRecord(deleteId);
      setDeleteId(null);
      setDeletePassword('');
      loadData();
    }
  };

  const getStatusInfo = (status: string, nextDate: string) => {
    const today = new Date();
    const next = new Date(nextDate);
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (status === 'critical' || diffDays < 0) return { 
        label: 'Crítico / Vencido', 
        color: 'bg-red-100 text-red-700 border-red-200', 
        icon: <FaExclamationTriangle /> 
    };
    if (status === 'attention' || diffDays < 30) return { 
        label: 'Atenção (Vence em breve)', 
        color: 'bg-amber-100 text-amber-700 border-amber-200', 
        icon: <FaClock /> 
    };
    return { 
        label: 'Conforme', 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: <FaCheckCircle /> 
    };
  };

  return (
    <div className={`p-8 h-screen flex flex-col ${bgColor} overflow-y-auto`}>
      <header className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Icon className={themeColor} /> 
            {isNR10 ? 'Gestão de Segurança NR10' : 'Gestão de Segurança NR13'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isNR10 
              ? 'Prontuário de Instalações Elétricas (PIE) e Painéis.' 
              : 'Caldeiras, Vasos de Pressão e Tubulações.'}
          </p>
        </div>
        <button 
          onClick={() => { setFormData({ status: 'compliant' }); setIsModalOpen(true); }}
          className={`${btnColor} text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95`}
        >
          <FaPlus /> Novo Ativo / Laudo
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 italic">Carregando registros...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.length > 0 ? records.map(record => {
            const status = getStatusInfo(record.status, record.nextInspection);
            return (
              <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className={`p-3 border-b flex justify-between items-center ${status.color}`}>
                  <span className="text-xs font-bold uppercase flex items-center gap-1">
                    {status.icon} {status.label}
                  </span>
                  <button onClick={() => setDeleteId(record.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <FaTrash size={12} />
                  </button>
                </div>
                <div className="p-5 flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{record.assetName}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{record.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="block text-slate-400 font-bold uppercase mb-1">Última Insp.</span>
                      <span className="text-slate-700 font-medium">{new Date(record.lastInspection + 'T12:00:00').toLocaleDateString()}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="block text-slate-400 font-bold uppercase mb-1">Próxima Insp.</span>
                      <span className={`font-bold ${record.status === 'critical' ? 'text-red-600' : 'text-slate-700'}`}>
                        {new Date(record.nextInspection + 'T12:00:00').toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                        {record.responsible.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Responsável Técnico</span>
                        <span className="text-xs text-slate-700 font-medium">{record.responsible}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-20 bg-white/50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 italic">
               Nenhum registro encontrado para esta categoria.
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className={`p-6 border-b text-white ${isNR10 ? 'bg-amber-600' : 'bg-indigo-600'}`}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FaShieldAlt /> Novo Laudo / Ativo {nrType}
            </h3>
            <p className="text-white/80 text-sm">Registre as informações técnicas para rastreamento de conformidade.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Nome do Ativo (Ex: Painel QGBT 01)</label>
              <input 
                required
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-slate-400" 
                value={formData.assetName} 
                onChange={e => setFormData({...formData, assetName: e.target.value})} 
                placeholder="Identificação clara do item"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Descrição Técnica</label>
              <textarea 
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-slate-400" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Ex: Fabricante, Capacidade, Número de Série..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Última Inspeção</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 border rounded-lg outline-none" 
                  value={formData.lastInspection} 
                  onChange={e => setFormData({...formData, lastInspection: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Vencimento (Laudo)</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-300" 
                  value={formData.nextInspection} 
                  onChange={e => setFormData({...formData, nextInspection: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Responsável Técnico</label>
                <input 
                  required
                  className="w-full p-3 border rounded-lg outline-none" 
                  value={formData.responsible} 
                  onChange={e => setFormData({...formData, responsible: e.target.value})} 
                  placeholder="Nome do Eng. / Técnico"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Status Inicial</label>
                <select 
                  className="w-full p-3 border rounded-lg outline-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="compliant">Conforme (OK)</option>
                  <option value="attention">Atenção (Melhorias)</option>
                  <option value="critical">Não Conforme (Crítico)</option>
                </select>
              </div>
            </div>
            <button type="submit" className={`w-full py-4 text-white font-bold rounded-xl shadow-xl transition-transform active:scale-95 ${btnColor}`}>
              Salvar Registro de Segurança
            </button>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Remover Ativo de Segurança?</h3>
              <p className="text-sm text-slate-500 mt-2">Esta ação exige senha administrativa e não pode ser desfeita.</p>
            </div>
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="relative">
                <FaLock className="absolute left-3 top-4 text-slate-400" />
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Senha Administrativa"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-400"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => {setDeleteId(null); setDeletePassword('');}} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30">Excluir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyManagement;
