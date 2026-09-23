import supabase from './_lib/db-client.js';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return false;
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data, error } = await userSupabase.auth.getUser(token);
  return !error && !!data?.user;
}

const DEFAULT_SECTIONS = [
  { section_key: 'offers', position: 0, enabled: true },
  { section_key: 'new_collection', position: 1, enabled: true },
  { section_key: 'featured', position: 2, enabled: true },
  { section_key: 'categories', position: 3, enabled: true },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('homepage_sections')
          .select('*')
          .order('position', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err) {
        console.warn('Supabase homepage_sections query error, serving default sections:', err.message);
        return res.status(200).json(DEFAULT_SECTIONS);
      }
    }

    if (req.method === 'PUT') {
      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
      const { sections } = req.body;
      if (!Array.isArray(sections)) return res.status(400).json({ error: 'Missing sections array' });
      const { error } = await supabase
        .from('homepage_sections')
        .upsert(sections, { onConflict: 'section_key' });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
