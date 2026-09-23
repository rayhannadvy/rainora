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

// Customers are derived live from the orders table (grouped by phone number)
// rather than stored separately, so they're always in sync with real orders.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const byPhone = new Map();
    for (const o of orders) {
      const key = o.customer_phone || 'unknown';
      if (!byPhone.has(key)) {
        byPhone.set(key, {
          phone: o.customer_phone,
          name: o.customer_name,
          address: o.customer_address,
          order_count: 0,
          total_spent: 0,
          last_order_at: o.created_at,
        });
      }
      const c = byPhone.get(key);
      c.order_count += 1;
      if (o.status !== 'Cancelled') c.total_spent += Number(o.total || 0);
      if (new Date(o.created_at) > new Date(c.last_order_at)) {
        c.last_order_at = o.created_at;
        c.name = o.customer_name;
        c.address = o.customer_address;
      }
    }

    const customers = Array.from(byPhone.values()).sort((a, b) => b.total_spent - a.total_spent);
    return res.status(200).json(customers);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
