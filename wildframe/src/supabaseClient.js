import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured =
  Boolean(url && publishableKey && !url.includes('YOUR_PROJECT_ID') && !publishableKey.includes('YOUR_SUPABASE'))

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey)
  : null
