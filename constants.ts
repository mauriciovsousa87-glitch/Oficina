import { Equipment } from './types';

export const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

export const MASTER_PASSWORD = '1234';

export const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const INITIAL_EQUIPMENT: Equipment[] = [
  { id: '1', name: 'Elevador Automotivo 1', type: 'machine', isActive: true },
  { id: '2', name: 'Elevador Automotivo 2', type: 'machine', isActive: true },
  { id: '3', name: 'Scanner de Diagnóstico', type: 'tool', isActive: true },
  { id: '4', name: 'Solda MIG/MAG', type: 'tool', isActive: true },
  { id: '5', name: 'Macaco Hidráulico', type: 'tool', isActive: true },
];