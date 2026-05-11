// Supabase client for the customer storefront.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[storefront/supabaseClient] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and restart `npm run dev`.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireAuth(redirect = 'signin.html') {
  const session = await getSession();
  if (!session) {
    // remember where we were trying to go
    const next = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    window.location.replace(`${redirect}?next=${next}`);
    return null;
  }
  return session;
}
