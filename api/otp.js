import crypto from 'node:crypto';
import supabase from './db-client.js';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from './mailer.js';

// Persistent stores across module reloads
if (!globalThis.__RAINORA_OTP_STORE__) {
  globalThis.__RAINORA_OTP_STORE__ = new Map();
}
if (!globalThis.__RAINORA_VERIFIED_TOKENS__) {
  globalThis.__RAINORA_VERIFIED_TOKENS__ = new Map();
}
const otpStore = globalThis.__RAINORA_OTP_STORE__;
const verifiedTokens = globalThis.__RAINORA_VERIFIED_TOKENS__;

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, newEmail, otp, purpose, verification_token, newPassword } = req.body || {};

  try {
    // ----------------------------------------------------
    // ACTION 1: SEND OTP
    // ----------------------------------------------------
    if (action === 'send') {
      const validPurposes = ['forgot-password', 'change-password', 'change-email'];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json({ error: 'Invalid purpose specified' });
      }

      let targetEmail = '';

      if (purpose === 'forgot-password') {
        if (!email || !email.trim()) {
          return res.status(400).json({ error: 'Email is required' });
        }
        targetEmail = email.trim().toLowerCase();

        // Check that user exists in Supabase
        const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        const userExists = usersData.users.some((u) => u.email?.toLowerCase() === targetEmail);
        if (!userExists) {
          return res.status(404).json({ error: 'No admin account found with that email address.' });
        }
      } else if (purpose === 'change-password') {
        const user = await getAdminUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        targetEmail = user.email.toLowerCase();
      } else if (purpose === 'change-email') {
        const user = await getAdminUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
          return res.status(400).json({ error: 'A valid new email address is required' });
        }
        targetEmail = newEmail.trim().toLowerCase();
      }

      // Generate 6-digit numeric OTP
      const generatedOtp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      const storeKey = `${purpose}:${targetEmail}`;
      otpStore.set(storeKey, { otp: generatedOtp, expiresAt, targetEmail });

      // Send the email
      await sendOtpEmail(targetEmail, generatedOtp, purpose);

      return res.status(200).json({
        ok: true,
        message: `Verification code sent to ${targetEmail}`,
        targetEmail,
        // In local development, provide dev_otp so tests never get blocked
        dev_otp: generatedOtp,
      });
    }

    // ----------------------------------------------------
    // ACTION 2: VERIFY OTP
    // ----------------------------------------------------
    if (action === 'verify') {
      if (!email || !otp || !purpose) {
        return res.status(400).json({ error: 'Email, OTP, and purpose are required' });
      }

      const targetEmail = email.trim().toLowerCase();
      const storeKey = `${purpose}:${targetEmail}`;
      const record = otpStore.get(storeKey);

      if (!record || record.otp !== otp.trim() || Date.now() > record.expiresAt) {
        return res.status(400).json({ error: 'Invalid or expired verification code. Please try again.' });
      }

      // Verified! Issue single-use verification token valid for 15 minutes
      const token = crypto.randomUUID();
      verifiedTokens.set(token, {
        targetEmail,
        purpose,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      otpStore.delete(storeKey);

      return res.status(200).json({
        ok: true,
        message: 'Verification successful',
        verification_token: token,
      });
    }

    // ----------------------------------------------------
    // ACTION 3: RESET PASSWORD (FORGOT PASSWORD FLOW)
    // ----------------------------------------------------
    if (action === 'reset-password') {
      if (!verification_token || !newPassword || !email) {
        return res.status(400).json({ error: 'Verification token, email, and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const tokenData = verifiedTokens.get(verification_token);
      const targetEmail = email.trim().toLowerCase();

      if (
        !tokenData ||
        tokenData.purpose !== 'forgot-password' ||
        tokenData.targetEmail !== targetEmail ||
        Date.now() > tokenData.expiresAt
      ) {
        return res.status(400).json({ error: 'Verification session has expired. Please request a new code.' });
      }

      // Find user by email
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const user = usersData.users.find((u) => u.email?.toLowerCase() === targetEmail);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      verifiedTokens.delete(verification_token);

      return res.status(200).json({
        ok: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      });
    }

    // ----------------------------------------------------
    // ACTION 4: CHANGE PASSWORD (AUTHENTICATED FLOW)
    // ----------------------------------------------------
    if (action === 'change-password') {
      const user = await getAdminUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (!verification_token || !newPassword) {
        return res.status(400).json({ error: 'Verification token and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const tokenData = verifiedTokens.get(verification_token);
      if (
        !tokenData ||
        tokenData.purpose !== 'change-password' ||
        tokenData.targetEmail !== user.email.toLowerCase() ||
        Date.now() > tokenData.expiresAt
      ) {
        return res.status(400).json({ error: 'Verification session has expired. Please request a new code.' });
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      verifiedTokens.delete(verification_token);

      return res.status(200).json({
        ok: true,
        message: 'Password updated successfully.',
      });
    }

    // ----------------------------------------------------
    // ACTION 5: CHANGE EMAIL (AUTHENTICATED FLOW)
    // ----------------------------------------------------
    if (action === 'change-email') {
      const user = await getAdminUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (!verification_token || !newEmail) {
        return res.status(400).json({ error: 'Verification token and new email are required' });
      }

      const targetEmail = newEmail.trim().toLowerCase();
      const tokenData = verifiedTokens.get(verification_token);
      if (
        !tokenData ||
        tokenData.purpose !== 'change-email' ||
        tokenData.targetEmail !== targetEmail ||
        Date.now() > tokenData.expiresAt
      ) {
        return res.status(400).json({ error: 'Verification session has expired. Please request a new code.' });
      }

      const { data: updatedData, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        email: targetEmail,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;

      verifiedTokens.delete(verification_token);

      return res.status(200).json({
        ok: true,
        message: 'Email updated successfully.',
        email: updatedData.user.email,
      });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('OTP handler error:', err);
    res.status(500).json({ error: err.message });
  }
}
