// Este arquivo é o que você deve editar!

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// [CORREÇÃO APLICADA AQUI]
const SUPABASE_URL = window.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = window.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// [FIM DA CORREÇÃO]

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});