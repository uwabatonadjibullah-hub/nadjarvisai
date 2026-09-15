/**
 * Supabase Client Factory for NAD JARVIS
 * Conforms to Section 0 & 2.1: Secrets live only server-side.
 * Service role key used only in trusted server contexts.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Trusted Server Admin Client (bypasses RLS only when performing server-only duties)
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are missing.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Client authenticated with the owner's JWT (RLS strictly enforced)
function getSupabaseUserClient(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase public credentials missing.');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getSupabaseAdmin,
  getSupabaseUserClient,
  getSupabaseAnon
};
