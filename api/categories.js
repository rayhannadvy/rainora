import fs from 'node:fs';
import path from 'node:path';
import supabase from './db-client.js';
import { createClient } from '@supabase/supabase-js';

const DATA_PATH = path.join(process.cwd(), 'data', 'categories.json');

const DEFAULT_CATEGORIES = [
  { key: 'pants', label: 'Denim Pants' },
  { key: 'full_sleeve', label: 'Full-Sleeve Shirts' },
  { key: 'half_sleeve', label: 'Half-Sleeve Shirts' },
  { key: 'polo', label: 'Polo T-Shirts' },
  { key: 'tshirt', label: 'Normal T-Shirts' },
];

function readCategories() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
      fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_CATEGORIES, null, 2), 'utf8');
      return DEFAULT_CATEGORIES;
    }
    const content = fs.readFileSync(DATA_PATH, 'utf8');
    const parsed = JSON.parse(content || '[]');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch (err) {
    console.error('Error reading categories.json:', err);
    return DEFAULT_CATEGORIES;
  }
}

function writeCategories(categories) {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(categories, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing categories.json:', err);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let categories = readCategories();

    if (req.method === 'GET') {
      // Also discover any categories in use on products table
      try {
        const { data: prodData } = await supabase.from('products').select('category');
        if (Array.isArray(prodData)) {
          const usedKeys = new Set(categories.map((c) => c.key));
          let changed = false;
          for (const item of prodData) {
            if (item.category && !usedKeys.has(item.category)) {
              // Auto-add new category from products
              const autoLabel = item.category
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
              categories.push({ key: item.category, label: autoLabel });
              usedKeys.add(item.category);
              changed = true;
            }
          }
          if (changed) {
            writeCategories(categories);
          }
        }
      } catch (e) {
        // If supabase query fails, fallback to local categories
      }

      return res.status(200).json(categories);
    }

    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { label, key } = req.body || {};
      if (!label || !label.trim()) {
        return res.status(400).json({ error: 'Category label is required' });
      }

      const cleanLabel = label.trim();
      let cleanKey = (key || cleanLabel)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      if (!cleanKey) {
        cleanKey = 'cat_' + Date.now();
      }

      const existingIndex = categories.findIndex((c) => c.key === cleanKey);
      if (existingIndex >= 0) {
        // Update label
        categories[existingIndex].label = cleanLabel;
      } else {
        categories.push({ key: cleanKey, label: cleanLabel });
      }

      writeCategories(categories);
      return res.status(201).json(categories);
    }

    if (req.method === 'PUT') {
      const { categories: updatedList } = req.body || {};
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        categories = updatedList;
        writeCategories(categories);
        return res.status(200).json(categories);
      }
      return res.status(400).json({ error: 'Invalid categories list' });
    }

    if (req.method === 'DELETE') {
      const { key } = req.body || {};
      if (!key) return res.status(400).json({ error: 'Category key is required' });

      // Check if products exist in this category
      try {
        const { data: prods } = await supabase.from('products').select('id').eq('category', key);
        if (Array.isArray(prods) && prods.length > 0) {
          return res.status(400).json({
            error: `Cannot delete category "${key}" because ${prods.length} product(s) are assigned to it. Reassign or delete those products first.`,
          });
        }
      } catch (e) {
        // Ignore DB error
      }

      categories = categories.filter((c) => c.key !== key);
      writeCategories(categories);
      return res.status(200).json(categories);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Categories API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
