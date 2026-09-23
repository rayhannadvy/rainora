import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://tnbhkfqaxbfmohtsssny.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_3FD7CCySQFIUM-D3CHX0nA_If6yOL98';

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.warn('Could not initialize live Supabase client, using fallback:', err);
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      refreshSession: async () => {},
      getUser: async () => ({ data: { user: null } }),
      signInWithPassword: async () => ({ error: new Error('Auth not configured') }),
      signOut: async () => {},
    },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  };
}

export default supabase;
