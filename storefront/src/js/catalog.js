// Read-only data access for the storefront (public tables + RLS rules).
import { supabase } from './supabaseClient.js';

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * List active products, optionally filtered by category + search term.
 * @param {{ categoryId?: string|null, search?: string, limit?: number }} opts
 */
export async function listProducts(opts = {}) {
  const { categoryId = null, search = '', limit = 48 } = opts;
  let q = supabase
    .from('products')
    .select('id, name, description, price, stock, image_url, category_id, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (categoryId)      q = q.eq('category_id', categoryId);
  if (search.trim())   q = q.ilike('name', `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, stock, image_url, category_id, categories(name, slug)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
