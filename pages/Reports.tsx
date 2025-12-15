import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaFilter } from 'react-icons/fa';
import * as reservationService from '../services/reservationService';
import { Reservation } from '../types';

const Reports: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [filterMonth]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const allRes = await reservationService.getAllReservations();
      
      // Filter by month
      const filtered = allRes.filter(r => r.date.startsWith(filterMonth));

      // Group by resource
      const grouped: Record<string, number> = {};
      filtered.forEach(r => {
        const key = r.resourceName;
        // Calculate duration in hours
        const start = parseInt(r.startTime.split(':')[0]);
        const end = parseInt(r.endTime.split(':')[0]);
        const duration = end - start;
        grouped[key] = (grouped[key] || 0) + duration;
      });

      const chartData = Object.keys(grouped).map(key => ({
        name: key,
        hours: grouped[key]
      }));

      setData(chartData.sort((a, b) => b.hours - a.hours));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Relatórios de Utilização</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <FaFilter className="text-slate-400" />
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mês de Referência</label>
            <input 
              type="month" 
              className="border border-slate-300 rounded p-2 text-slate-700"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">Gerando gráfico...</div>
        ) : data.length > 0 ? (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                <YAxis tick={{fill: '#64748b'}} label={{ value: 'Horas Reservadas', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f1f5f9'}}
                />
                <Legend />
                <Bar dataKey="hours" name="Horas de Uso" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                Nenhum dado encontrado para este período.
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
