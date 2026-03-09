
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Equipment, MaintenanceOrder, SafetyRecord, VaporBacklog, PCMArea } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const STORAGE_KEYS = {
  RESERVATIONS: 'oficina_sys_reservations_v2',
  EQUIPMENT: 'oficina_sys_equipment_v2',
  BLACKLIST: 'oficina_sys_equipment_blacklist_v1',
  MAINTENANCE: 'oficina_sys_maintenance_v1',
  SAFETY: 'oficina_sys_safety_v1',
  VAPOR_BACKLOG: 'oficina_sys_vapor_backlog_v1',
  PCM_AREAS: 'oficina_sys_pcm_areas_v1'
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
      const { data, error } = await supabase.from('equipment').insert([payload]).select();
      if (error) {
        console.error("Supabase Equipment Insert Error:", error);
        throw new Error(`Erro ao salvar equipamento: ${error.message}`);
      }
      if (!data || data.length === 0) {
        console.error("Supabase Equipment Insert returned no data");
        throw new Error("Nenhum dado retornado após salvar o equipamento.");
      }
      return { ...equip, id: data[0].id.toString() };
    }
  } catch (e) { return equip; }
};

export const getReservationsByDate = async (date: string): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) return mockReservations.filter(r => r.date === date);
  try {
    const { data } = await supabase.from('reservations').select('*').eq('date', date);
    return (data || []).map(r => ({ 
      id: r.id.toString(), 
      resourceId: r.resource_id, 
      resourceName: r.resource_name, 
      type: r.type, 
      date: r.date, 
      startTime: r.start_time, 
      endTime: r.end_time, 
      requester: r.requester, 
      observation: r.observation, 
      costSaved: r.cost_saved, 
      scaffoldingType: r.scaffolding_type,
      status: r.status,
      disassemblyDate: r.disassembly_date,
      points: r.points,
      area: r.area,
      manufactureStartDate: r.manufacture_start_date,
      manufactureEndDate: r.manufacture_end_date,
      impactValue: r.impact_value,
      impactUnit: r.impact_unit
    }));
  } catch (e) { return mockReservations.filter(r => r.date === date); }
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  if (!isSupabaseConfigured()) return mockReservations;
  try {
    const { data } = await supabase.from('reservations').select('*');
    return (data || []).map(r => ({ 
      id: r.id.toString(), 
      resourceId: r.resource_id, 
      resourceName: r.resource_name, 
      type: r.type, 
      date: r.date, 
      startTime: r.start_time, 
      endTime: r.end_time, 
      requester: r.requester, 
      observation: r.observation, 
      costSaved: r.cost_saved, 
      scaffoldingType: r.scaffolding_type,
      status: r.status,
      disassemblyDate: r.disassembly_date,
      points: r.points,
      area: r.area,
      manufactureStartDate: r.manufacture_start_date,
      manufactureEndDate: r.manufacture_end_date,
      impactValue: r.impact_value,
      impactUnit: r.impact_unit
    }));
  } catch (e) { return mockReservations; }
};

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
  // Validate Overlap
  const hasOverlap = await checkOverlap(res.date, res.startTime, res.endTime, res.resourceId);
  if (hasOverlap) {
    throw new Error("Conflito de horário detectado para este recurso.");
  }

  if (!isSupabaseConfigured()) {
    const newRes = { ...res, id: Math.random().toString(36).substr(2, 9), status: res.status || 'pending' };
    mockReservations = [...mockReservations, newRes];
    saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
    return newRes;
  }
  const payload: any = { 
    resource_id: res.resourceId, 
    resource_name: res.resourceName, 
    type: res.type, 
    date: res.date, 
    start_time: res.startTime, 
    end_time: res.endTime, 
    requester: res.requester, 
    status: res.status || 'pending'
  };

  if (res.observation) payload.observation = res.observation;
  if (res.costSaved !== undefined) payload.cost_saved = res.costSaved;
  if (res.scaffoldingType) payload.scaffolding_type = res.scaffoldingType;
  if (res.disassemblyDate) payload.disassembly_date = res.disassemblyDate;
  if (res.points !== undefined) payload.points = res.points;
  if (res.area) payload.area = res.area;
  if (res.manufactureStartDate) payload.manufacture_start_date = res.manufactureStartDate;
  if (res.manufactureEndDate) payload.manufacture_end_date = res.manufactureEndDate;
  if (res.impactValue !== undefined) payload.impact_value = res.impactValue;
  if (res.impactUnit) payload.impact_unit = res.impactUnit;

  const { data, error } = await supabase.from('reservations').insert([payload]).select();
  
  if (error) {
    console.error("Supabase Insert Error:", error);
    throw new Error(`Erro ao criar reserva: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error("Nenhum dado retornado após a criação da reserva.");
  }
  
  return { ...res, id: data[0].id.toString() };
};

export const updateReservationStatus = async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
  if (!isSupabaseConfigured()) {
    mockReservations = mockReservations.map(r => r.id === id ? { ...r, status } : r);
    saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
    return;
  }
  await supabase.from('reservations').update({ status }).eq('id', id);
};

export const deleteReservation = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) await supabase.from('reservations').delete().eq('id', id);
  mockReservations = mockReservations.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.RESERVATIONS, mockReservations);
};

export const getMaintenanceOrders = async (type: 'motor' | 'board'): Promise<MaintenanceOrder[]> => {
  if (!isSupabaseConfigured()) return mockMaintenance.filter(m => m.type === type);
  const { data } = await supabase.from('maintenance_orders').select('*').eq('type', type);
  return (data || []).map(d => ({ 
    id: d.id.toString(), 
    type: d.type, 
    itemName: d.item_name, 
    description: d.description, 
    status: d.status, 
    costSaved: d.cost_saved, 
    technician: d.technician, 
    entryDate: d.entry_date, 
    completionDate: d.completion_date,
    requesterName: d.requester_name,
    area: d.area,
    subArea: d.sub_area
  }));
};

export const saveMaintenanceOrder = async (order: MaintenanceOrder): Promise<MaintenanceOrder> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<MaintenanceOrder[]>(STORAGE_KEYS.MAINTENANCE, []);
    const updated = order.id ? current.map(o => o.id === order.id ? order : o) : [...current, { ...order, id: Math.random().toString(36).substr(2, 9) }];
    saveToStorage(STORAGE_KEYS.MAINTENANCE, updated);
    return order;
  }
  // Fixed typo: changed order.completion_date to order.completionDate
  const payload = { 
    type: order.type, 
    item_name: order.itemName, 
    description: order.description, 
    status: order.status, 
    cost_saved: order.costSaved, 
    technician: order.technician, 
    entry_date: order.entryDate, 
    completion_date: order.completionDate,
    requester_name: order.requesterName,
    area: order.area,
    sub_area: order.subArea
  };
  if (order.id) {
    const { error } = await supabase.from('maintenance_orders').update(payload).eq('id', order.id);
    if (error) {
      console.error("Supabase Maintenance Update Error:", error);
      throw new Error(`Erro ao atualizar ordem de manutenção: ${error.message}`);
    }
  } else {
    const { data, error } = await supabase.from('maintenance_orders').insert([payload]).select();
    if (error) {
      console.error("Supabase Maintenance Insert Error:", error);
      throw new Error(`Erro ao criar ordem de manutenção: ${error.message}`);
    }
    if (!data || data.length === 0) {
      console.error("Supabase Maintenance Insert returned no data");
      throw new Error("Nenhum dado retornado após criar a ordem de manutenção.");
    }
    return { ...order, id: data[0].id.toString() };
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
    const { error } = await supabase.from('safety_records').update(payload).eq('id', record.id);
    if (error) {
      console.error("Supabase Safety Update Error:", error);
      throw new Error(`Erro ao atualizar registro de segurança: ${error.message}`);
    }
  } else {
    const { data, error } = await supabase.from('safety_records').insert([payload]).select();
    if (error) {
      console.error("Supabase Safety Insert Error:", error);
      throw new Error(`Erro ao criar registro de segurança: ${error.message}`);
    }
    if (!data || data.length === 0) {
      console.error("Supabase Safety Insert returned no data");
      throw new Error("Nenhum dado retornado após criar o registro de segurança.");
    }
    record.id = data[0].id.toString();
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

// --- VAPOR BACKLOG OPERATIONS ---
export const getVaporBacklog = async (): Promise<VaporBacklog[]> => {
  if (!isSupabaseConfigured()) {
    return loadFromStorage<VaporBacklog[]>(STORAGE_KEYS.VAPOR_BACKLOG, []);
  }
  try {
    const { data } = await supabase.from('vapor_backlog').select('*');
    return (data || []).map(v => ({
      id: v.id.toString(),
      area: v.area,
      subArea: v.sub_area,
      problem: v.problem,
      impactValue: v.impact_value,
      investment: v.investment,
      executionDate: v.execution_date || '',
      startTime: v.start_time,
      endTime: v.end_time,
      status: v.status,
      createdAt: v.created_at
    }));
  } catch (e) {
    return [];
  }
};

export const saveVaporBacklog = async (item: VaporBacklog): Promise<VaporBacklog> => {
  if (!isSupabaseConfigured()) {
    const current = loadFromStorage<VaporBacklog[]>(STORAGE_KEYS.VAPOR_BACKLOG, []);
    let updated;
    if (item.id && item.id !== '') {
      updated = current.map(v => v.id === item.id ? item : v);
    } else {
      const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
      updated = [...current, newItem];
      item.id = newItem.id;
    }
    saveToStorage(STORAGE_KEYS.VAPOR_BACKLOG, updated);
    return item;
  }
  const payload = {
    area: item.area,
    sub_area: item.subArea,
    problem: item.problem,
    impact_value: item.impactValue,
    investment: item.investment,
    execution_date: item.executionDate || null,
    start_time: item.startTime,
    end_time: item.endTime,
    status: item.status
  };
  if (item.id && item.id !== '') {
    const { error } = await supabase.from('vapor_backlog').update(payload).eq('id', item.id);
    if (error) throw new Error(`Erro ao atualizar backlog: ${error.message}`);
  } else {
    const { data, error } = await supabase.from('vapor_backlog').insert([payload]).select();
    if (error) throw new Error(`Erro ao criar backlog: ${error.message}`);
    if (data && data.length > 0) item.id = data[0].id.toString();
  }
  return item;
};

export const deleteVaporBacklog = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    await supabase.from('vapor_backlog').delete().eq('id', id);
  }
  const current = loadFromStorage<VaporBacklog[]>(STORAGE_KEYS.VAPOR_BACKLOG, []);
  saveToStorage(STORAGE_KEYS.VAPOR_BACKLOG, current.filter(v => v.id !== id));
};

// --- PCM AREAS OPERATIONS ---
export const getPCMAreas = async (date: string): Promise<PCMArea | null> => {
  if (!isSupabaseConfigured()) {
    const all = loadFromStorage<PCMArea[]>(STORAGE_KEYS.PCM_AREAS, []);
    return all.find(p => p.date === date) || null;
  }
  try {
    const { data } = await supabase.from('pcm_areas').select('*').eq('date', date).single();
    if (!data) return null;
    return {
      id: data.id.toString(),
      date: data.date,
      areas: data.areas
    };
  } catch (e) {
    return null;
  }
};

export const savePCMArea = async (pcm: PCMArea): Promise<PCMArea> => {
  if (!isSupabaseConfigured()) {
    const all = loadFromStorage<PCMArea[]>(STORAGE_KEYS.PCM_AREAS, []);
    const existingIndex = all.findIndex(p => p.date === pcm.date);
    let updated;
    if (existingIndex !== -1) {
      updated = [...all];
      updated[existingIndex] = pcm;
    } else {
      updated = [...all, { ...pcm, id: Math.random().toString(36).substr(2, 9) }];
    }
    saveToStorage(STORAGE_KEYS.PCM_AREAS, updated);
    return pcm;
  }
  const payload = {
    date: pcm.date,
    areas: pcm.areas
  };
  const { data: existing } = await supabase.from('pcm_areas').select('id').eq('date', pcm.date).single();
  if (existing) {
    const { error } = await supabase.from('pcm_areas').update(payload).eq('id', existing.id);
    if (error) throw new Error(`Erro ao atualizar PCM: ${error.message}`);
  } else {
    const { error } = await supabase.from('pcm_areas').insert([payload]);
    if (error) throw new Error(`Erro ao criar PCM: ${error.message}`);
  }
  return pcm;
};
