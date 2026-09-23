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

const DEFAULT_SETTINGS = {
  id: 1,
  shop_name: 'RAINORA',
  tagline: 'Treasury of the Finest Export Collection',
  logo_url: 'https://tnbhkfqaxbfmohtsssny.supabase.co/storage/v1/object/public/rainora-products/logo_1788420144489_rainora%20logo.jpg',
  facebook: 'https://www.facebook.com/rainora.fabrics',
  instagram: 'https://www.instagram.com/rainora.fabrics',
  whatsapp: '8801305986630',
  phone: '01305986630',
  address: '2nd floor, Aslam Villa (Besides Metro Provati counter), GEC road, 2 number gate, Chattogram 4203',
  offer_banner_title: 'Special Offers',
  offer_banner_subtitle: 'Grab these export pieces before the discount runs out — gg products.',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err) {
        console.warn('Supabase settings query error, serving default settings:', err.message);
        return res.status(200).json(DEFAULT_SETTINGS);
      }
    }

    if (req.method === 'PUT') {
      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
      const updates = { ...req.body, id: 1 };
      const { data, error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
