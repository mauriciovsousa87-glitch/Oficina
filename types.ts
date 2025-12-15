
export type EquipmentType = 'machine' | 'tool' | 'vehicle' | 'area' | 'steam'; // Added 'steam'

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  resourceId: string; // Equipment ID or Scaffolding Location or Area
  resourceName: string; 
  type: 'workshop' | 'scaffolding' | 'refrigeration' | 'machining' | 'armstrong'; // Added 'armstrong'
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  requester: string;
  observation?: string;
  scaffoldingType?: 'assembly' | 'disassembly'; 
  costSaved?: number; // Added for REC and Armstrong
  createdAt?: string;
}

export interface MaintenanceOrder {
  id: string;
  type: 'motor' | 'board';
  itemName: string;
  description: string; // Failure reason
  status: 'pending' | 'in_progress' | 'completed';
  costSaved: number;
  technician?: string;
  entryDate: string; // YYYY-MM-DD
  completionDate?: string; // YYYY-MM-DD
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasReservation: boolean;
  reservationCount: number;
}