import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DATA_PATH = path.join(process.cwd(), 'data', 'new-collection-exclusions.json');

function readExclusions() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
      fs.writeFileSync(DATA_PATH, '[]', 'utf8');
      return [];
    }
    const content = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading new-collection-exclusions.json:', err);
    return [];
  }
}

function writeExclusions(exclusions) {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(exclusions, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing new-collection-exclusions.json:', err);
  }
}

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

  try {
    const currentExclusions = readExclusions();

    if (req.method === 'GET') {
      return res.status(200).json(currentExclusions);
    }

    if (req.method === 'POST') {
      const isAdmin = await verifyAdmin(req);
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

      const { action, product_id, excluded_ids } = req.body || {};

      let updated = [...currentExclusions];

      if (Array.isArray(excluded_ids)) {
        updated = excluded_ids.map(Number);
      } else if (action === 'remove' && product_id) {
        // Exclude this product from new collection
        const idNum = Number(product_id);
        if (!updated.includes(idNum)) {
          updated.push(idNum);
        }
      } else if (action === 'include' && product_id) {
        // Re-include this product into new collection
        const idNum = Number(product_id);
        updated = updated.filter((id) => id !== idNum);
      }

      writeExclusions(updated);
      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('New collection API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
