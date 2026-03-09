
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
  // New fields
  status?: 'pending' | 'approved' | 'rejected';
  disassemblyDate?: string; // For Scaffolding
  points?: number; // For Scaffolding
  area?: string; // For Scaffolding summary
  manufactureStartDate?: string; // For Machining
  manufactureEndDate?: string; // For Machining
  impactValue?: number; // For Armstrong
  impactUnit?: 'MJ' | 'vapor' | 'agua' | 'MJ/hl' | 'R$' | 'ton'; // For Armstrong
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
  // New fields
  requesterName?: string;
  area?: string;
  subArea?: string;
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

export interface VaporBacklog {
  id: string;
  area: string;
  subArea: string;
  problem: string;
  impactValue: number;
  investment: number;
  executionDate?: string;
  startTime?: string;
  endTime?: string;
  status: 'not_programmed' | 'programmed' | 'realized';
  createdAt?: string;
}

export interface PCMArea {
  id: string;
  date: string;
  areas: string[];
}
