/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = import.meta.env.SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

const supabaseUrl="https://uqnmmtysoeuwnozkkaos.supabase.co"
const supabaseAnonKey="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbm1tdHlzb2V1d25vemtrYW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MDc3OTQsImV4cCI6MjA1NDk4Mzc5NH0.kjzBxxWNEoP-UjhFIRQo-RG7zcHkiAQmM-jbVpL9U4Y"
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})