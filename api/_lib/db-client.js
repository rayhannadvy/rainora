import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './db-wake.js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://tnbhkfqaxbfmohtsssny.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_3FD7CCySQFIUM-D3CHX0nA_If6yOL98';

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: async (url, options) => {
        try {
          const res = await fetch(url, options);
          if (!res.ok && res.status >= 500) triggerRestore();
          return res;
        } catch (err) {
          triggerRestore();
          throw err;
        }
      },
    },
  });
} catch (err) {
  console.error('Failed to create Supabase client:', err);
  supabase = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: (name) => ({ data: { publicUrl: `/uploads/${name}` } }),
      }),
    },
  };
}

export default supabase;
