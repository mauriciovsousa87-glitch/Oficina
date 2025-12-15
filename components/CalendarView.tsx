import React from 'react';
import { HOURS, DAYS_OF_WEEK } from '../constants';
import { Reservation } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  onSlotClick: (date: Date, time: string) => void;
  onEventClick?: (reservation: Reservation) => void;
  reservations: Reservation[];
  themeColor: 'blue' | 'orange';
}

const SLOT_HEIGHT = 64; // Height in pixels for each hour slot (h-16 = 64px)

const CalendarView: React.FC<CalendarViewProps> = ({ 
  currentDate, 
  onSlotClick, 
  onEventClick,
  reservations, 
  themeColor 
}) => {
  // Helper: Get the start of the week (Sunday) based on currentDate
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; 
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);

  // Generate the 7 days of the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Get reservations strictly for a specific day
  const getReservationsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(r => r.date === dateStr);
  };

  // Calculate position and height based on HOURS array
  const getEventPosition = (res: Reservation) => {
    const startIndex = HOURS.findIndex(h => h === res.startTime);
    let endIndex = HOURS.findIndex(h => h === res.endTime);
    
    // Fallback if endTime is last slot or not found exactly (e.g. half hour logic could go here later)
    if (endIndex === -1) endIndex = HOURS.length;

    const top = startIndex * SLOT_HEIGHT;
    const height = (endIndex - startIndex) * SLOT_HEIGHT;

    return { top, height };
  };

  // Styles based on theme
  const headerBg = themeColor === 'blue' ? 'bg-slate-100' : 'bg-orange-50';
  const borderColor = themeColor === 'blue' ? 'border-slate-200' : 'border-orange-200';
  
  const getEventStyle = () => {
    if (themeColor === 'blue') {
      return "bg-blue-100 border-l-4 border-blue-600 text-blue-900 shadow-md shadow-blue-500/10 hover:brightness-95";
    }
    return "bg-orange-100 border-l-4 border-orange-600 text-orange-900 shadow-md shadow-orange-500/10 hover:brightness-95";
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${borderColor} overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]`}>
      {/* Header Row: Days of Week */}
      <div className="flex border-b border-slate-200 shadow-sm z-10 relative">
        {/* Time Column Header */}
        <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-200"></div>
        
        {/* Days Headers */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200">
          {weekDays.map((day, index) => {
            const isToday = new Date().toDateString() === day.toDateString();
            return (
              <div key={index} className={`p-3 text-center ${headerBg}`}>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{DAYS_OF_WEEK[index]}</div>
                <div className={`text-lg font-bold ${isToday ? (themeColor === 'blue' ? 'text-blue-600' : 'text-orange-600') : 'text-slate-700'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto flex-1 relative custom-scrollbar">
        <div className="flex">
            {/* Time Column (Sidebar) */}
            <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-200">
                {HOURS.map((time) => (
                    <div key={time} className="h-16 flex items-start justify-center pt-2 text-xs font-medium text-slate-400 border-b border-slate-100 relative">
                        <span className="-mt-2.5 bg-slate-50 px-1">{time}</span>
                    </div>
                ))}
                {/* Extra space at bottom */}
                <div className="h-8"></div>
            </div>

            {/* Days Grid */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 relative">
                {weekDays.map((day, dayIndex) => {
                    const dayReservations = getReservationsForDay(day);

                    return (
                        <div key={dayIndex} className="relative">
                            {/* 1. Background Grid Lines & Click Handlers */}
                            {HOURS.map((time) => (
                                <div 
                                    key={time} 
                                    className="h-16 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => onSlotClick(day, time)}
                                ></div>
                            ))}

                            {/* 2. Events Layer (Absolute Positioned) */}
                            {dayReservations.map((res) => {
                                const { top, height } = getEventPosition(res);
                                
                                return (
                                    <div
                                        key={res.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick && onEventClick(res);
                                        }}
                                        style={{ top: `${top}px`, height: `${height - 1}px` }} // -1px for visual gap
                                        className={`absolute inset-x-1 p-2 rounded-md cursor-pointer flex flex-col justify-start overflow-hidden transition-all z-10 ${getEventStyle()}`}
                                        title={`${res.startTime} - ${res.endTime}: ${res.resourceName}`}
                                    >
                                        <div className="font-bold text-xs leading-tight mb-1">{res.resourceName}</div>
                                        <div className="text-[10px] opacity-90 leading-tight truncate">{res.requester}</div>
                                        {res.observation && <div className="text-[9px] opacity-70 mt-1 italic truncate">{res.observation}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;