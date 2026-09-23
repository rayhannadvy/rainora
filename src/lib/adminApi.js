import supabase from './supabase';

// Attaches the current admin's Supabase access token to a fetch call so
// server-side API routes can verify the request via supabase.auth.getUser().
export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
