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

// Manages which products are pinned to the homepage "Featured Pieces"
// section. New Collection (newest products) and Special Offers (products
// with a discount) are fully automatic, but Featured Pieces is
// admin-curated so the shop owner can control exactly what shows there.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase.from('featured_products').select('product_id');
        if (error) throw error;
        return res.status(200).json(data.map((r) => r.product_id));
      } catch (err) {
        console.warn('Supabase featured query error, serving fallback:', err.message);
        return res.status(200).json([2, 3]);
      }
    }

    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { product_id } = req.body;
      if (!product_id) return res.status(400).json({ error: 'Missing product_id' });
      const { error } = await supabase
        .from('featured_products')
        .upsert({ product_id }, { onConflict: 'product_id' });
      if (error) throw error;
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { product_id } = req.body;
      if (!product_id) return res.status(400).json({ error: 'Missing product_id' });
      const { error } = await supabase.from('featured_products').delete().eq('product_id', product_id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
