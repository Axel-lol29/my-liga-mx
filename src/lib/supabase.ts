import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';
export const supabase: SupabaseClient | null = APP_CONFIG.hasSupabase ? createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }) : null;
export function getSupabaseConfigError(): Error { return new Error('Supabase aún no está configurado. Añade las variables de entorno requeridas.'); }
