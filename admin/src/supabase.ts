import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export type AdminProfile = {
  id: string
  full_name: string
  role: 'general_admin' | 'subadmin' | 'chapter_representative'
  permissions: string[]
  is_active: boolean
}
