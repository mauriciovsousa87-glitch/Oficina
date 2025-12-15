import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Equipment } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

// --- LOCAL STORAGE HELPERS ---
const STORAGE_KEYS = {
  RESERVATIONS: 'oficina_sys_reservations_v2',
  EQUIPMENT: 'oficina_sys_equipment_v2'
};

const loadFromStorage = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.warn(`Failed to load ${key} from storage`, e);
    return defaultVal;
  }
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage`, e);
  }
};

// INITIALIZATION
let mockReservations: Reservation[] = loadFromStorage(STORAGE_KEYS.RESERVATIONS, []);
let mockEquipment: Equipment[] = loadFromStorage(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);

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

    return start < resEnd && end > resStart;
  });
};

// --- CRUD Operations ---

// Updated: Accepts includeInactive parameter to allow Settings page to see everything
export const getEquipment = async (includeInactive: boolean = false): Promise<Equipment[]> => {
  let result: Equipment[] = [];

  // OFFLINE MODE
  if (!isSupabaseConfigured()) {
    mockEquipment = loadFromStorage(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
    result = mockEquipment;
  } else {
    // ONLINE MODE
    try {
      let query = supabase
        .from('equipment')
        .select('*')
        .order('name', { ascending: true });

      // If we ONLY want active ones (for Workshop page), filter in DB
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (data) {
        result = data.map((d: any) => ({
          id: d.id.toString(),
          name: d.name,
          type: d.type,
          isActive: d.is_active 
        }));
      }
    } catch (e) {
      console.warn("Supabase fetch error (using local fallback):", e);
      result = [...mockEquipment];
    }
  }

  // Double check filtering (for offline or fallback)
  if (!includeInactive) {
      return result.filter(e => e.isActive !== false);
  }

  return result;
};

// Updated: Handles both Insert (Create) and Update (Edit)
export const saveEquipment = async (equip: Equipment): Promise<Equipment> => {
  // OFFLINE
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
    
    if (equip.id) {
        // UPDATE
        const updated = current.map(e => e.id === equip.id ? equip : e);
        mockEquipment = updated;
        saveToStorage(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        return Promise.resolve(equip);
    } else {
        // INSERT
        const newEquip = { ...equip, id: Math.random().toString(36).substr(2, 9) };
        mockEquipment = [...current, newEquip];
        saveToStorage(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        return Promise.resolve(newEquip);
    }
  }
  
  // ONLINE
  try {
    if (equip.id) {
        // UPDATE
        // Ensure ID is number if DB requires it, or string
        const idParam = /^\d+$/.test(equip.id) ? parseInt(equip.id, 10) : equip.id;
        
        const { data, error } = await supabase
            .from('equipment')
            .update({
                name: equip.name,
                type: equip.type,
                is_active: equip.isActive
            })
            .eq('id', idParam)
            .select();

        if (error) throw error;
        return { ...equip }; // Return updated object
    } else {
        // INSERT
        const { data, error } = await supabase.from('equipment').insert([{
            name: equip.name,
            type: equip.type,
            is_active: equip.isActive
        }]).select();
        
        if (error) throw error;
        return { ...equip, id: data[0].id.toString() };
    }
  } catch (e) {
    console.error("Save failed, falling back to local storage", e);
    // Fallback logic mostly for safety, though sync might be lost
    return equip;
  }
};

// Legacy delete kept for safety, but we primarily use saveEquipment for toggling active status now
export const deleteEquipment = async (id: string): Promise<void> => {
   const idStr = String(id);

   // OFFLINE
   if (!isSupabaseConfigured()) {
       const current = loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
       // Hard delete locally if requested via this function
       const updated = current.filter(e => String(e.id) !== idStr);
       saveToStorage(STORAGE_KEYS.EQUIPMENT, updated);
       mockEquipment = updated;
       return Promise.resolve();
   }

   // ONLINE
   try {
        const idParam = /^\d+$/.test(id) ? parseInt(id, 10) : id;
        await supabase.from('equipment').delete().eq('id', idParam);
   } catch (err) {
       console.error("Delete failed", err);
   }
   
   return Promise.resolve();
};

export const getReservationsByDate = async (date: string): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) {
    mockReservations = loadFromStorage(STORAGE_KEYS.RESERVATIONS, []);
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
        scaffoldingType: r.scaffolding_type,
        observation: r.observation
    }));
  } catch (e) {
      console.warn("Reservation fetch failed, using mock:", e);
      return mockReservations.filter(r => r.date === date);
  }
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) {
    mockReservations = loadFromStorage(STORAGE_KEYS.RESERVATIONS, []);
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
        scaffoldingType: r.scaffolding_type,
        observation: r.observation
    }));
  } catch (e) {
      console.warn("Get all failed, using mock:", e);
      return mockReservations;
  }
}

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
  const hasOverlap = await checkOverlap(res.date, res.startTime, res.endTime, res.resourceId);
  if (hasOverlap) {
    throw new Error("Conflito de horário detectado para este recurso.");
  }

  if (!isSupabaseConfigured()) {
    const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
    const current = loadFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    mockReservations = [...current, newRes];
    saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
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
        scaffolding_type: res.scaffoldingType,
        observation: res.observation
    }]).select();

    if (error) throw error;
    
    return { ...res, id: data[0].id.toString() };
  } catch (e) {
      console.error("Create failed, using mock", e);
      const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
      mockReservations.push(newRes);
      saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
      return newRes;
  }
};

export const deleteReservation = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    mockReservations = current.filter(r => r.id !== id);
    saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
    return Promise.resolve();
  }
  
  const idParam = /^\d+$/.test(id) ? parseInt(id, 10) : id;

  const { error } = await supabase.from('reservations').delete().eq('id', idParam);
  
  if (error) {
      console.error("Failed to delete reservation:", error);
      throw error;
  }
  
  mockReservations = mockReservations.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
};