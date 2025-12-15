import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Equipment } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

// MOCK DATA STORAGE (Fallback if Supabase is not connected)
let mockReservations: Reservation[] = [];
let mockEquipment: Equipment[] = [...INITIAL_EQUIPMENT];

// Helpers
const parseTime = (time: string) => parseInt(time.replace(':', ''), 10);

export const checkOverlap = async (
  date: string,
  startTime: string,
  endTime: string,
  resourceId: string,
  excludeId?: string
): Promise<boolean> => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const existing = await getReservationsByDate(date);
  
  return existing.some(res => {
    if (res.id === excludeId) return false;
    if (res.resourceId !== resourceId) return false;
    
    const resStart = parseTime(res.startTime);
    const resEnd = parseTime(res.endTime);

    // Overlap logic: (StartA < EndB) and (EndA > StartB)
    return start < resEnd && end > resStart;
  });
};

// --- CRUD Operations ---

export const getEquipment = async (): Promise<Equipment[]> => {
  if (!isSupabaseConfigured()) return Promise.resolve(mockEquipment);

  try {
    const { data, error } = await supabase.from('equipment').select('*');
    if (error) throw error;
    if (!data) return mockEquipment;
    
    return data.map((d: any) => ({
      id: d.id.toString(),
      name: d.name,
      type: d.type,
      isActive: d.is_active
    }));
  } catch (e) {
    console.warn("Supabase fetch error, falling back to mock:", e);
    return mockEquipment;
  }
};

export const saveEquipment = async (equip: Equipment): Promise<Equipment> => {
  if (!isSupabaseConfigured()) {
    const newEquip = { ...equip, id: equip.id || Math.random().toString(36).substr(2, 9) };
    mockEquipment.push(newEquip);
    return Promise.resolve(newEquip);
  }
  
  try {
    const { data, error } = await supabase.from('equipment').insert([{
      name: equip.name,
      type: equip.type,
      is_active: equip.isActive
    }]).select();
    
    if (error) throw error;
    return { ...equip, id: data[0].id.toString() };
  } catch (e) {
    console.error("Save failed, using mock", e);
    const newEquip = { ...equip, id: equip.id || Math.random().toString(36).substr(2, 9) };
    mockEquipment.push(newEquip);
    return newEquip;
  }
};

export const deleteEquipment = async (id: string): Promise<void> => {
   if (!isSupabaseConfigured()) {
    mockEquipment = mockEquipment.filter(e => e.id !== id);
    return Promise.resolve();
  }
  
  try {
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Delete failed, using mock", e);
    mockEquipment = mockEquipment.filter(e => e.id !== id);
  }
};


export const getReservationsByDate = async (date: string): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(mockReservations.filter(r => r.date === date));
  }

  try {
    const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', date);

    if (error) throw error;

    return data.map((r: any) => ({
        id: r.id.toString(),
        resourceId: r.resource_id,
        resourceName: r.resource_name,
        type: r.type,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        requester: r.requester,
        scaffoldingType: r.scaffolding_type
    }));
  } catch (e) {
      console.warn("Reservation fetch failed, using mock:", e);
      return mockReservations.filter(r => r.date === date);
  }
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(mockReservations);
  }
  try {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) throw error;
    return data.map((r: any) => ({
        id: r.id.toString(),
        resourceId: r.resource_id,
        resourceName: r.resource_name,
        type: r.type,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        requester: r.requester,
        scaffoldingType: r.scaffolding_type
    }));
  } catch (e) {
      console.warn("Get all failed, using mock:", e);
      return mockReservations;
  }
}

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
  // Validate Overlap locally first (optimistic)
  const hasOverlap = await checkOverlap(res.date, res.startTime, res.endTime, res.resourceId);
  if (hasOverlap) {
    throw new Error("Conflito de horário detectado para este recurso.");
  }

  if (!isSupabaseConfigured()) {
    const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
    mockReservations.push(newRes);
    return Promise.resolve(newRes);
  }

  try {
    const { data, error } = await supabase.from('reservations').insert([{
        resource_id: res.resourceId,
        resource_name: res.resourceName,
        type: res.type,
        date: res.date,
        start_time: res.startTime,
        end_time: res.endTime,
        requester: res.requester,
        scaffolding_type: res.scaffoldingType
    }]).select();

    if (error) throw error;
    
    return { ...res, id: data[0].id.toString() };
  } catch (e) {
      console.error("Create failed, using mock", e);
      const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
      mockReservations.push(newRes);
      return newRes;
  }
};

export const deleteReservation = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    mockReservations = mockReservations.filter(r => r.id !== id);
    return Promise.resolve();
  }
  try {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
      console.error("Delete failed, using mock", e);
      mockReservations = mockReservations.filter(r => r.id !== id);
  }
};