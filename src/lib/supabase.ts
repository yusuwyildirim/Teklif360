/**
 * Supabase Client Configuration
 * Teklif360 için Supabase bağlantısı
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables eksik!');
  console.error('VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY .env dosyasında tanımlanmalı');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Bağlantı durumu kontrolü
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('project_history').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') { // Tablo yoksa hata normal
      console.warn('Supabase bağlantı uyarısı:', error.message);
    }
    return true;
  } catch (err) {
    console.error('Supabase bağlantı hatası:', err);
    return false;
  }
}
