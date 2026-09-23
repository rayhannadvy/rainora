import supabase from './db-client.js';
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

// Best-effort stock decrement: for each ordered item, reduce the matching
// size's quantity in the product's `sizes` jsonb column (never below 0).
async function decrementStock(items) {
  for (const item of items) {
    if (!item.product_id || !item.size) continue;
    const { data: product } = await supabase
      .from('products')
      .select('sizes')
      .eq('id', item.product_id)
      .single();
    if (!product) continue;
    const stock = product.sizes || {};
    const current = Number(stock[item.size] ?? 0);
    const updated = { ...stock, [item.size]: Math.max(0, current - Number(item.qty || 0)) };
    await supabase.from('products').update({ sizes: updated }).eq('id', item.product_id);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    // Placing an order is public — customers don't have accounts.
    if (req.method === 'POST') {
      const { customer_name, customer_phone, customer_address, items, total } = req.body;
      if (!customer_name || !customer_phone || !customer_address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required order fields' });
      }
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name,
          customer_phone,
          customer_address,
          items,
          total: Number(total) || 0,
          status: 'Pending',
        })
        .select()
        .single();
      if (error) throw error;
      decrementStock(items).catch((err) => console.error('Stock decrement error:', err));
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }


    if (req.method === 'DELETE') {

      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

      const { id, ids, status, clearAll } = req.body || {};

      if (id) {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true, message: 'Order deleted successfully' });
      }

      if (Array.isArray(ids) && ids.length > 0) {
        const { error } = await supabase.from('orders').delete().in('id', ids);
        if (error) throw error;
        return res.status(200).json({ ok: true, message: `${ids.length} order(s) deleted successfully` });
      }

      if (status) {
        const { error } = await supabase.from('orders').delete().eq('status', status);
        if (error) throw error;
        return res.status(200).json({ ok: true, message: `All ${status} orders cleared` });
      }

      if (clearAll === true) {
        const { error } = await supabase.from('orders').delete().neq('id', 0);
        if (error) throw error;
        return res.status(200).json({ ok: true, message: 'All orders cleared' });
      }

      return res.status(400).json({ error: 'Missing order deletion parameters' });
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
