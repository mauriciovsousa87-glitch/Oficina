
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Equipment, MaintenanceOrder, SafetyRecord } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const STORAGE_KEYS = {
  RESERVATIONS: 'oficina_sys_reservations_v2',
  EQUIPMENT: 'oficina_sys_equipment_v2',
  BLACKLIST: 'oficina_sys_equipment_blacklist_v1',
  MAINTENANCE: 'oficina_sys_maintenance_v1',
  SAFETY: 'oficina_sys_safety_v1'
};

const loadFromStorage = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key}`, e);
  }
};

let mockReservations: Reservation[] = loadFromStorage(STORAGE_KEYS.RESERVATIONS, []);
let mockEquipment: Equipment[] = loadFromStorage(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
let mockMaintenance: MaintenanceOrder[] = loadFromStorage(STORAGE_KEYS.MAINTENANCE, []);
let mockSafety: SafetyRecord[] = loadFromStorage(STORAGE_KEYS.SAFETY, []);

const parseTime = (time: string) => parseInt(time.replace(':', ''), 10);

export const checkOverlap = async (date: string, startTime: string, endTime: string, resourceId: string, excludeId?: string): Promise<boolean> => {
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

export const getEquipment = async (includeInactive: boolean = false): Promise<Equipment[]> => {
  const blacklist = loadFromStorage<string[]>(STORAGE_KEYS.BLACKLIST, []);
  let result: Equipment[] = [];
  if (!isSupabaseConfigured()) {
    result = loadFromStorage(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
  } else {
    try {
      let query = supabase.from('equipment').select('*').order('name', { ascending: true });
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (data) result = data.map((d: any) => ({ id: d.id.toString(), name: d.name, type: d.type, isActive: d.is_active }));
    } catch (e) { result = [...mockEquipment]; }
  }
  return result.filter(e => !blacklist.includes(e.id) && (includeInactive || e.isActive));
};

export const saveEquipment = async (equip: Equipment): Promise<Equipment> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENT, [...INITIAL_EQUIPMENT]);
    const updated = equip.id ? current.map(e => e.id === equip.id ? equip : e) : [...current, { ...equip, id: Math.random().toString(36).substr(2, 9) }];
    saveToStorage(STORAGE_KEYS.EQUIPMENT, updated);
    return equip;
  }
  try {
    const payload = { name: equip.name, type: equip.type, is_active: equip.isActive };
    if (equip.id) {
      await supabase.from('equipment').update(payload).eq('id', equip.id);
      return equip;
    } else {
      const { data } = await supabase.from('equipment').insert([payload]).select();
      return { ...equip, id: data![0].id.toString() };
    }
  } catch (e) { return equip; }
};

export const getReservationsByDate = async (date: string): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) return mockReservations.filter(r => r.date === date);
  try {
    const { data } = await supabase.from('reservations').select('*').eq('date', date);
    return (data || []).map(r => ({ id: r.id.toString(), resourceId: r.resource_id, resourceName: r.resource_name, type: r.type, date: r.date, startTime: r.start_time, endTime: r.end_time, requester: r.requester, observation: r.observation, costSaved: r.cost_saved, scaffoldingType: r.scaffolding_type }));
  } catch (e) { return mockReservations.filter(r => r.date === date); }
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) return mockReservations;
  try {
    const { data } = await supabase.from('reservations').select('*');
    return (data || []).map(r => ({ id: r.id.toString(), resourceId: r.resource_id, resourceName: r.resource_name, type: r.type, date: r.date, startTime: r.start_time, endTime: r.end_time, requester: r.requester, observation: r.observation, costSaved: r.cost_saved, scaffoldingType: r.scaffolding_type }));
  } catch (e) { return mockReservations; }
};

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
  if (!isSupabaseConfigured()) {
    const newRes = { ...res, id: Math.random().toString(36).substr(2, 9) };
    mockReservations = [...mockReservations, newRes];
    saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
    return newRes;
  }
  const { data } = await supabase.from('reservations').insert([{ resource_id: res.resourceId, resource_name: res.resourceName, type: res.type, date: res.date, start_time: res.startTime, end_time: res.endTime, requester: res.requester, observation: res.observation, cost_saved: res.costSaved || 0, scaffolding_type: res.scaffoldingType }]).select();
  return { ...res, id: data![0].id.toString() };
};

export const deleteReservation = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) await supabase.from('reservations').delete().eq('id', id);
  mockReservations = mockReservations.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
};

export const getMaintenanceOrders = async (type: 'motor' | 'board'): Promise<MaintenanceOrder[]> => {
  if (!isSupabaseConfigured()) return mockMaintenance.filter(m => m.type === type);
  const { data } = await supabase.from('maintenance_orders').select('*').eq('type', type);
  return (data || []).map(d => ({ id: d.id.toString(), type: d.type, itemName: d.item_name, description: d.description, status: d.status, costSaved: d.cost_saved, technician: d.technician, entryDate: d.entry_date, completionDate: d.completion_date }));
};

export const saveMaintenanceOrder = async (order: MaintenanceOrder): Promise<MaintenanceOrder> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<MaintenanceOrder[]>(STORAGE_KEYS.MAINTENANCE, []);
    const updated = order.id ? current.map(o => o.id === order.id ? order : o) : [...current, { ...order, id: Math.random().toString(36).substr(2, 9) }];
    saveToStorage(STORAGE_KEYS.MAINTENANCE, updated);
    return order;
  }
  // Fixed typo: changed order.completion_date to order.completionDate
  const payload = { type: order.type, item_name: order.itemName, description: order.description, status: order.status, cost_saved: order.costSaved, technician: order.technician, entry_date: order.entryDate, completion_date: order.completionDate };
  if (order.id) await supabase.from('maintenance_orders').update(payload).eq('id', order.id);
  else {
    const { data } = await supabase.from('maintenance_orders').insert([payload]).select();
    return { ...order, id: data![0].id.toString() };
  }
  return order;
};

export const deleteMaintenanceOrder = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) await supabase.from('maintenance_orders').delete().eq('id', id);
};

// --- SAFETY OPERATIONS (NEW) ---
export const getSafetyRecords = async (nrType: 'NR10' | 'NR13'): Promise<SafetyRecord[]> => {
  if (!isSupabaseConfigured()) {
    return loadFromStorage<SafetyRecord[]>(STORAGE_KEYS.SAFETY, []).filter(s => s.nrType === nrType);
  }
  try {
    const { data } = await supabase.from('safety_records').select('*').eq('nr_type', nrType);
    return (data || []).map(s => ({
      id: s.id.toString(),
      nrType: s.nr_type,
      assetName: s.asset_name,
      description: s.description,
      lastInspection: s.last_inspection,
      nextInspection: s.next_inspection,
      status: s.status,
      responsible: s.responsible,
      documentUrl: s.document_url
    }));
  } catch (e) {
    return [];
  }
};

export const saveSafetyRecord = async (record: SafetyRecord): Promise<SafetyRecord> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<SafetyRecord[]>(STORAGE_KEYS.SAFETY, []);
    let updated;
    if (record.id && record.id !== '') {
      updated = current.map(s => s.id === record.id ? record : s);
    } else {
      const newRec = { ...record, id: Math.random().toString(36).substr(2, 9) };
      updated = [...current, newRec];
      record.id = newRec.id;
    }
    saveToStorage(STORAGE_KEYS.SAFETY, updated);
    return record;
  }
  const payload = {
    nr_type: record.nrType,
    asset_name: record.assetName,
    description: record.description,
    last_inspection: record.lastInspection,
    next_inspection: record.nextInspection,
    status: record.status,
    responsible: record.responsible,
    document_url: record.documentUrl
  };
  if (record.id && record.id !== '') {
    await supabase.from('safety_records').update(payload).eq('id', record.id);
  } else {
    const { data } = await supabase.from('safety_records').insert([payload]).select();
    record.id = data![0].id.toString();
  }
  return record;
};

export const deleteSafetyRecord = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    await supabase.from('safety_records').delete().eq('id', id);
  }
  const current = loadFromStorage<SafetyRecord[]>(STORAGE_KEYS.SAFETY, []);
  saveToStorage(STORAGE_KEYS.SAFETY, current.filter(s => s.id !== id));
};
