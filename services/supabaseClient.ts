import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DIRETA (HARDCODED) ---
// Inseridas conforme solicitado para garantir conexão imediata
const SUPABASE_URL = 'https://ghgyiscnzcwokillnlox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZ3lpc2NuemN3b2tpbGxubG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzgyMjYsImV4cCI6MjA4MDk1NDIyNn0.1qzhIJ7A0pfxl8cuHTqFnCAZ7cMIICfhuYKlfhkhchU';

// Verifica se as chaves são válidas (simples checagem de string não vazia)
const hasValidKey = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

if (hasValidKey) {
  console.log("✅ Supabase: Conectado via credenciais fixas.");
} else {
  console.log("⚠️ Supabase: Credenciais ausentes.");
}

export const supabase = createClient(
    hasValidKey ? SUPABASE_URL : 'https://placeholder.supabase.co', 
    hasValidKey ? SUPABASE_KEY : 'placeholder-key'
);

export const isSupabaseConfigured = () => {
  return hasValidKey;
};

// Funções legadas removidas para evitar erros, mantidas vazias caso algo ainda as chame
export const getStoredSupabaseConfig = () => null;
export const saveSupabaseConfig = () => {};
export const clearSupabaseConfig = () => {};