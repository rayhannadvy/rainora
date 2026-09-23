import supabase from './db-client.js';
import { createClient } from '@supabase/supabase-js';

async function getAdminUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data, error } = await userSupabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getAdminUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      return res.status(200).json({ email: user.email });
    }

    if (req.method === 'POST') {
      const { email, password } = req.body || {};
      const updates = {};

      if (email && email.trim()) {
        const trimmedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return res.status(400).json({ error: 'Invalid email address format' });
        }
        updates.email = trimmedEmail;
        updates.email_confirm = true;
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        updates.password = password;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No email or password provided to update' });
      }

      const { data, error } = await supabase.auth.admin.updateUserById(user.id, updates);
      if (error) throw error;

      return res.status(200).json({
        ok: true,
        message: 'Account credentials updated successfully',
        email: data.user.email,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin account update error:', err);
    res.status(500).json({ error: err.message });
  }
}
