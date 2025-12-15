
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Equipment, MaintenanceOrder } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

// --- LOCAL STORAGE HELPERS ---
const STORAGE_KEYS = {
  RESERVATIONS: 'oficina_sys_reservations_v2',
  EQUIPMENT: 'oficina_sys_equipment_v2',
  BLACKLIST: 'oficina_sys_equipment_blacklist_v1',
  MAINTENANCE: 'oficina_sys_maintenance_v1' // New key
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
let mockMaintenance: MaintenanceOrder[] = loadFromStorage(STORAGE_KEYS.MAINTENANCE, []);

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

// --- EQUIPMENT OPERATIONS ---

export const getEquipment = async (includeInactive: boolean = false): Promise<Equipment[]> => {
  const blacklist = loadFromStorage<string[]>(STORAGE_KEYS.BLACKLIST, []);
  let result: Equipment[] = [];

  if (!isSupabaseConfigured()) {
    mockEquipment = loadFromStorage(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
    result = mockEquipment;
  } else {
    try {
      let query = supabase.from('equipment').select('*').order('name', { ascending: true });
      if (!includeInactive) query = query.eq('is_active', true);

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

  return result.filter(e => {
      if (blacklist.includes(e.id)) return false;
      if (!includeInactive && e.isActive === false) return false;
      return true;
  });
};

export const saveEquipment = async (equip: Equipment): Promise<Equipment> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
    if (equip.id) {
        const updated = current.map(e => e.id === equip.id ? equip : e);
        mockEquipment = updated;
        saveToStorage(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        return Promise.resolve(equip);
    } else {
        const newEquip = { ...equip, id: Math.random().toString(36).substr(2, 9) };
        mockEquipment = [...current, newEquip];
        saveToStorage(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        return Promise.resolve(newEquip);
    }
  }
  
  try {
    if (equip.id) {
        const idParam = /^\d+$/.test(equip.id) ? parseInt(equip.id, 10) : equip.id;
        const { error } = await supabase
            .from('equipment')
            .update({ name: equip.name, type: equip.type, is_active: equip.isActive })
            .eq('id', idParam);
        if (error) throw error;
        return { ...equip };
    } else {
        const { data, error } = await supabase.from('equipment').insert([{
            name: equip.name, type: equip.type, is_active: equip.isActive
        }]).select();
        if (error) throw error;
        return { ...equip, id: data[0].id.toString() };
    }
  } catch (e) {
    console.error("Save failed", e);
    return equip;
  }
};

// --- RESERVATION OPERATIONS ---

export const getReservationsByDate = async (date: string): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) {
    mockReservations = loadFromStorage(STORAGE_KEYS.RESERVATIONS, []);
    return Promise.resolve(mockReservations.filter(r => r.date === date));
  }

  try {
    const { data, error } = await supabase.from('reservations').select('*').eq('date', date);
    if (error) throw error;
    return mapReservationData(data);
  } catch (e) {
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
    return mapReservationData(data);
  } catch (e) {
      return mockReservations;
  }
};

const mapReservationData = (data: any[]): Reservation[] => {
    return data.map(r => ({
        id: r.id.toString(),
        resourceId: r.resource_id,
        resourceName: r.resource_name,
        type: r.type,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        requester: r.requester,
        scaffoldingType: r.scaffolding_type,
        observation: r.observation,
        costSaved: r.cost_saved
    }));
};

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
  const hasOverlap = await checkOverlap(res.date, res.startTime, res.endTime, res.resourceId);
  if (hasOverlap) throw new Error("Conflito de horário detectado.");

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
        observation: res.observation,
        cost_saved: res.costSaved || 0
    }]).select();

    if (error) throw error;
    return { ...res, id: data[0].id.toString() };
  } catch (e) {
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
  await supabase.from('reservations').delete().eq('id', idParam);
  mockReservations = mockReservations.filter(r => r.id !== id);
};

// --- MAINTENANCE ORDERS OPERATIONS (NEW) ---

export const getMaintenanceOrders = async (type: 'motor' | 'board'): Promise<MaintenanceOrder[]> => {
    if (!isSupabaseConfigured()) {
        mockMaintenance = loadFromStorage(STORAGE_KEYS.MAINTENANCE, []);
        return mockMaintenance.filter(m => m.type === type);
    }
    try {
        const { data, error } = await supabase.from('maintenance_orders').select('*').eq('type', type);
        if (error) throw error;
        return data.map((d: any) => ({
            id: d.id.toString(),
            type: d.type,
            itemName: d.item_name,
            description: d.description,
            status: d.status,
            costSaved: d.cost_saved,
            technician: d.technician,
            entryDate: d.entry_date,
            completionDate: d.completion_date
        }));
    } catch (e) {
        return mockMaintenance.filter(m => m.type === type);
    }
};

export const saveMaintenanceOrder = async (order: MaintenanceOrder): Promise<MaintenanceOrder> => {
    if (!isSupabaseConfigured()) {
        const current = loadFromStorage<MaintenanceOrder[]>(STORAGE_KEYS.MAINTENANCE, []);
        if (order.id) {
            const updated = current.map(o => o.id === order.id ? order : o);
            mockMaintenance = updated;
            saveToStorage(STORAGE_KEYS.MAINTENANCE, mockMaintenance);
            return order;
        } else {
            const newOrder = { ...order, id: Math.random().toString(36).substr(2, 9) };
            mockMaintenance = [...current, newOrder];
            saveToStorage(STORAGE_KEYS.MAINTENANCE, mockMaintenance);
            return newOrder;
        }
    }

    try {
        const payload = {
            type: order.type,
            item_name: order.itemName,
            description: order.description,
            status: order.status,
            cost_saved: order.costSaved,
            technician: order.technician,
            entry_date: order.entryDate,
            completion_date: order.completionDate
        };

        if (order.id && order.id !== '') {
            const idParam = /^\d+$/.test(order.id) ? parseInt(order.id, 10) : order.id;
            const { error } = await supabase.from('maintenance_orders').update(payload).eq('id', idParam);
            if (error) throw error;
            return order;
        } else {
            const { data, error } = await supabase.from('maintenance_orders').insert([payload]).select();
            if (error) throw error;
            return { ...order, id: data[0].id.toString() };
        }
    } catch (e) {
        console.error("Maintenance save error", e);
        return order;
    }
};

export const deleteMaintenanceOrder = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        mockMaintenance = mockMaintenance.filter(m => m.id !== id);
        saveToStorage(STORAGE_KEYS.MAINTENANCE, mockMaintenance);
        return;
    }
    const idParam = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    await supabase.from('maintenance_orders').delete().eq('id', idParam);
};
