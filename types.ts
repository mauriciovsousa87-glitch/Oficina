export type EquipmentType = 'machine' | 'tool' | 'vehicle';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  resourceId: string; // Equipment ID or Scaffolding Location
  resourceName: string; // Denormalized for display
  type: 'workshop' | 'scaffolding';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  requester: string;
  scaffoldingType?: 'assembly' | 'disassembly'; // Only for scaffolding
  createdAt?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasReservation: boolean;
  reservationCount: number;
}
