import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import supabase from './db-client.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'reviews.json');

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


function readReviews() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
      fs.writeFileSync(DATA_PATH, '[]', 'utf8');
      return [];
    }
    const content = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading reviews.json:', err);
    return [];
  }
}

function writeReviews(reviews) {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(reviews, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing reviews.json:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const allReviews = readReviews();

    if (req.method === 'GET') {
      const { productId, all } = req.query || {};

      // Return summary map for all products if requested
      if (all === 'summary') {
        const summary = {};
        for (const r of allReviews) {
          if (!summary[r.product_id]) {
            summary[r.product_id] = { totalRating: 0, count: 0 };
          }
          summary[r.product_id].totalRating += Number(r.rating || 5);
          summary[r.product_id].count += 1;
        }
        const result = {};
        for (const [pid, data] of Object.entries(summary)) {
          result[pid] = {
            averageRating: Number((data.totalRating / data.count).toFixed(1)),
            reviewCount: data.count,
          };
        }
        return res.status(200).json(result);
      }

      if (productId) {
        const prodId = Number(productId);
        const filtered = allReviews.filter((r) => Number(r.product_id) === prodId);

        const reviewCount = filtered.length;
        const totalScore = filtered.reduce((sum, r) => sum + Number(r.rating || 5), 0);
        const averageRating = reviewCount > 0 ? Number((totalScore / reviewCount).toFixed(1)) : 5.0;

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        filtered.forEach((r) => {
          const stars = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
          distribution[stars] = (distribution[stars] || 0) + 1;
        });

        return res.status(200).json({
          productId: prodId,
          averageRating,
          reviewCount,
          distribution,
          reviews: filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        });
      }

      return res.status(200).json(allReviews);
    }

    if (req.method === 'POST') {
      const { action, reviewId } = req.body || {};

      // Helpful upvote action
      if (action === 'helpful' && reviewId) {
        const index = allReviews.findIndex((r) => r.id === Number(reviewId));
        if (index !== -1) {
          allReviews[index].helpful_count = (allReviews[index].helpful_count || 0) + 1;
          writeReviews(allReviews);
          return res.status(200).json(allReviews[index]);
        }
        return res.status(404).json({ error: 'Review not found' });
      }

      // Admin reply to customer review
      if (action === 'reply' && reviewId) {
        const isAdmin = await verifyAdmin(req);
        if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

        const { replyText } = req.body || {};
        const index = allReviews.findIndex((r) => r.id === Number(reviewId));
        if (index !== -1) {
          allReviews[index].admin_reply = replyText ? replyText.trim() : null;
          allReviews[index].replied_at = replyText ? new Date().toISOString() : null;
          writeReviews(allReviews);
          return res.status(200).json(allReviews[index]);
        }
        return res.status(404).json({ error: 'Review not found' });
      }

      // Admin delete review
      if (action === 'delete' && reviewId) {
        const isAdmin = await verifyAdmin(req);
        if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

        const filtered = allReviews.filter((r) => r.id !== Number(reviewId));
        writeReviews(filtered);
        return res.status(200).json({ ok: true });
      }


      // Customer review photo upload action
      if (action === 'upload-photo') {
        const { fileName, fileBase64, contentType } = req.body || {};
        if (!fileBase64) return res.status(400).json({ error: 'No image data provided' });

        const safeExt = path.extname(fileName || 'photo.jpg') || '.jpg';
        const newFileName = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;

        // 1. Try Supabase storage if accessible
        try {
          const rawBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(rawBase64, 'base64');
          const { error: storageErr } = await supabase.storage
            .from('rainora-products')
            .upload(`reviews/${newFileName}`, buffer, {
              contentType: contentType || 'image/jpeg',
              upsert: true,
            });

          if (!storageErr) {
            const { data: urlData } = supabase.storage
              .from('rainora-products')
              .getPublicUrl(`reviews/${newFileName}`);
            if (urlData?.publicUrl) {
              return res.status(200).json({ url: urlData.publicUrl });
            }
          }
        } catch (e) {
          console.warn('Supabase storage fallback for review photo:', e.message);
        }

        // 2. Local filesystem storage in public/uploads/
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          const rawBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(rawBase64, 'base64');
          fs.writeFileSync(path.join(uploadsDir, newFileName), buffer);
          return res.status(200).json({ url: `/uploads/${newFileName}` });
        } catch (e) {
          // 3. Fallback to data URI if needed
          return res.status(200).json({ url: fileBase64 });
        }
      }

      const {
        product_id,
        customer_name,
        customer_phone,
        rating,
        comment,
        photo_url,
      } = req.body || {};

      if (!product_id || !customer_name || !comment) {
        return res.status(400).json({ error: 'Missing required review fields' });
      }


      // Check if user has an order with this product in Supabase to confirm verified purchase
      let isVerified = true;
      if (customer_phone) {
        try {
          const { data: orderMatches } = await supabase
            .from('orders')
            .select('id, items')
            .eq('customer_phone', customer_phone.trim());

          if (orderMatches && orderMatches.length > 0) {
            const hasPurchased = orderMatches.some((ord) =>
              (ord.items || []).some((item) => Number(item.id) === Number(product_id))
            );
            if (hasPurchased) isVerified = true;
          }
        } catch (e) {
          console.warn('Could not verify purchase with orders DB:', e.message);
        }
      }

      const newReview = {
        id: allReviews.length > 0 ? Math.max(...allReviews.map((r) => r.id)) + 1 : 1,
        product_id: Number(product_id),
        customer_name: customer_name.trim(),
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        verified: isVerified,
        comment: comment.trim(),
        photo_url: photo_url || null,
        created_at: new Date().toISOString(),
        helpful_count: 0,
      };

      allReviews.push(newReview);
      writeReviews(allReviews);

      return res.status(201).json(newReview);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
