import { createClient } from '@supabase/supabase-js';

// NOTA: Em um ambiente de produção real, estas chaves estariam em um arquivo .env
// O usuário deve criar um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_KEY

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ghgyiscnzcwokillnlox.supabase.co';

// Tenta obter a chave do ambiente
const envKey = (import.meta as any).env?.VITE_SUPABASE_KEY;

// Verifica se a chave é válida (existe e não é vazia)
const hasValidKey = envKey && envKey.length > 0;

// Se não houver chave válida, usamos uma string dummy no formato JWT para evitar
// que o createClient lance o erro "supabaseKey is required" e quebre a aplicação.
// O serviço de reservas verificará isSupabaseConfigured() antes de tentar fazer chamadas reais.
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTg1NjAwMCwiZXhwIjoyMDI1MjE2MDAwfQ.Hb';

const supabaseKey = hasValidKey ? envKey : fallbackKey;

if (!hasValidKey) {
  console.warn("⚠️ Supabase Key não detectada. Iniciando em modo OFFLINE/DEMO.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return hasValidKey;
};