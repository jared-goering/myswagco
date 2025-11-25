import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: check if env vars are loaded
if (typeof window !== 'undefined') {
  console.log('Supabase client init:', { 
    urlPresent: !!supabaseUrl, 
    keyPresent: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 30) 
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

