/**
 * Supabase Client Factory for NAD JARVIS
 * Conforms to Section 0 & 2.1: Secrets live only server-side.
 * Uses modern Supabase Publishable Key and Secret Key format.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Modern Supabase API Key naming: Publishable Key & Secret Key
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Trusted Server Admin Client (bypasses RLS only when performing server-only duties)
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error('Supabase credentials (SUPABASE_URL / SUPABASE_SECRET_KEY) are missing.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Client authenticated with the owner's JWT (RLS strictly enforced)
function getSupabaseUserClient(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase publishable credentials missing.');
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Client for anonymous / initial authentication actions (sign-in)
function getSupabaseAnon() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase publishable credentials missing.');
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY,
  getSupabaseAdmin,
  getSupabaseUserClient,
  getSupabaseAnon
};
