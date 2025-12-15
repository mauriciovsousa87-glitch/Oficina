import React from 'react';
import { DAYS_OF_WEEK } from '../constants';

interface CalendarViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  reservations: { [dateStr: string]: number }; // Count of reservations per date
  themeColor: 'blue' | 'orange';
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, onDateClick, reservations, themeColor }) => {
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50 border border-slate-200"></div>);
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    const count = reservations[dateStr] || 0;
    const isToday = new Date().toDateString() === dateObj.toDateString();

    const colorClass = themeColor === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200';
    const dotClass = themeColor === 'blue' ? 'bg-blue-500' : 'bg-orange-500';

    days.push(
      <div 
        key={day} 
        onClick={() => onDateClick(dateObj)}
        className={`h-24 border border-slate-200 p-2 cursor-pointer hover:bg-slate-50 transition-colors relative group ${isToday ? 'bg-slate-100' : 'bg-white'}`}
      >
        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
          {day}
        </div>
        {count > 0 && (
          <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}>
            {count} Reservas
          </div>
        )}
        {count > 0 && (
            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dotClass}`}></div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
};

export default CalendarView;
