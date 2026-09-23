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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    const { fileName, fileBase64, contentType } = req.body;
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'Missing file data' });

    const buffer = Buffer.from(fileBase64, 'base64');
    const { error } = await supabase.storage
      .from('rainora-products')
      .upload(fileName, buffer, { contentType: contentType || 'image/jpeg', upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('rainora-products').getPublicUrl(fileName);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
}
