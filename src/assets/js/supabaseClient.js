// Shared Supabase client for the Admin Panel.
// Uses Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud but non-fatal: pages that don't need Supabase still work.
  console.warn(
    '[supabaseClient] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and restart `npm run dev`.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ------- small convenience helpers used across admin pages -------

/** Returns the current session or null. */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Returns the current user's profile row (including role) or null. */
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.error('[supabaseClient] getCurrentProfile failed:', error);
    return null;
  }
  return data;
}

/**
 * Redirects to the given URL unless the current user is an admin.
 * Use at the top of every protected admin page.
 */
export async function requireAdmin(redirectTo = 'signin.html') {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    window.location.replace(redirectTo);
    return null;
  }
  return profile;
}

/** Sign out and go back to the sign-in page. */
export async function signOutAndRedirect(redirectTo = 'signin.html') {
  await supabase.auth.signOut();
  window.location.replace(redirectTo);
}
