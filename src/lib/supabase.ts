import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = import.meta.env.MODE === 'test' || !url || !anonKey ? null : createClient(url, anonKey)
