// src/lib/db.ts - Supabase client for Uraba Food Fest
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.server.osbrai.com';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'uraba_food_fest' },
    auth: { persistSession: false },
  });
  return _supabase;
}

export default getSupabase;

// Types
export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  instagram: string;
  qr_code: string;
  created_at: string;
}

export interface Vote {
  id: number;
  nombre: string;
  whatsapp: string;
  ip: string;
  fingerprint: string;
  restaurant_id: number;
  rating: number;
  voted_at: string;
}

export interface Settings {
  key: string;
  value: string;
  updated_at: string;
}
