import fs from 'node:fs';
import path from 'node:path';
import supabase from './_lib/db-client.js';
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_PRODUCTS } from './_lib/fallback-products.js';

const FALLBACK_PRODUCTS_PATH = path.join(process.cwd(), 'data', 'products.json');

function getFallbackProducts() {
  try {
    if (fs.existsSync(FALLBACK_PRODUCTS_PATH)) {
      const content = fs.readFileSync(FALLBACK_PRODUCTS_PATH, 'utf8');
      const parsed = JSON.parse(content || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading fallback products:', err);
  }
  return FALLBACK_PRODUCTS || [];
}

function saveFallbackProducts(products) {
  try {
    if (Array.isArray(products) && products.length > 0) {
      fs.writeFileSync(FALLBACK_PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf8');
    }
  } catch (err) {
    // Ignore read-only filesystem errors on serverless
  }
}

async function verifyAdmin(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return false;
  try {
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tnbhkfqaxbfmohtsssny.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3FD7CCySQFIUM-D3CHX0nA_If6yOL98'
    );
    const { data, error } = await userSupabase.auth.getUser(token);
    return !error && !!data?.user;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        saveFallbackProducts(data);
        return res.status(200).json(data);
      } catch (err) {
        console.warn('Supabase product query error, serving fallback cache:', err.message);
        const fallback = getFallbackProducts();
        if (fallback.length > 0) {
          return res.status(200).json(fallback);
        }
        throw err;
      }
    }

    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { name, brand, category, price, original_price, description, sizes, image_url } = req.body;
      if (!name || !brand || !category || !price || !image_url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const { data, error } = await supabase
        .from('products')
        .insert({ name, brand, category, price, original_price, description, sizes, image_url })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
