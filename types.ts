
export type EquipmentType = 'machine' | 'tool' | 'vehicle' | 'area' | 'steam' | 'electrical' | 'pressure_vessel';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string; 
  type: 'workshop' | 'scaffolding' | 'refrigeration' | 'machining' | 'armstrong';
  date: string;
  startTime: string;
  endTime: string;
  requester: string;
  observation?: string;
  scaffoldingType?: 'assembly' | 'disassembly'; 
  costSaved?: number;
  createdAt?: string;
}

export interface MaintenanceOrder {
  id: string;
  type: 'motor' | 'board';
  itemName: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  costSaved: number;
  technician?: string;
  entryDate: string;
  completionDate?: string;
}

export interface SafetyRecord {
  id: string;
  nrType: 'NR10' | 'NR13';
  assetName: string;
  description: string;
  lastInspection: string;
  nextInspection: string;
  status: 'compliant' | 'attention' | 'critical';
  responsible: string;
  documentUrl?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasReservation: boolean;
  reservationCount: number;
}
