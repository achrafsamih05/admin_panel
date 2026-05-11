// Profile/address data access helpers shared by the profile page AND checkout.
import { supabase } from './supabaseClient.js';

/** Fetch the currently-signed-in user's profile row, or null. */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) {
    // Re-throw so callers can tell the difference between "profile not found"
    // (null) and "could not reach Supabase" (throw).
    throw error;
  }
  return data;
}

/** Patch the current user's profile row. */
export async function updateMyProfile(patch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Does the profile have enough data to ship to? */
export function hasShippingAddress(p) {
  return !!(p && p.address_line1 && p.city && p.country);
}
