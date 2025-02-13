/// <reference types="vite/client" />

declare module '@/utils/supa' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient;
}
