// Product + category data access layer backed by Supabase.
import { supabase } from './supabaseClient.js';

const BUCKET = 'product-images';

/* -------------------- categories -------------------- */

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* -------------------- products -------------------- */

/**
 * List products with their category name joined.
 * @param {{ search?: string, categoryId?: string|null, limit?: number, offset?: number }} opts
 */
export async function listProducts(opts = {}) {
  const { search = '', categoryId = null, limit = 50, offset = 0 } = opts;

  let query = supabase
    .from('products')
    .select('id, sku, name, description, price, stock, image_url, image_path, is_active, category_id, categories(name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
  if (categoryId)    query = query.eq('category_id', categoryId);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

/** Fetch a single product (for editing). */
export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upload an image file to the product-images bucket and return
 * { path, publicUrl }.
 */
export async function uploadProductImage(file) {
  if (!file) return { path: null, publicUrl: null };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function removeImageByPath(path) {
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn('[products] failed to delete storage object', path, e);
  }
}

/**
 * Create a product. `payload` shape:
 * { sku, name, description, price, stock, category_id, is_active, imageFile? }
 */
export async function createProduct(payload) {
  const { imageFile, ...rest } = payload;
  let image_url = null, image_path = null;
  if (imageFile) {
    const up = await uploadProductImage(imageFile);
    image_url = up.publicUrl;
    image_path = up.path;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...rest, image_url, image_path })
    .select()
    .single();
  if (error) {
    // roll back the upload if insert fails
    if (image_path) await removeImageByPath(image_path);
    throw error;
  }
  return data;
}

/**
 * Update a product. If `imageFile` is provided the old image is removed
 * and replaced with the new one.
 */
export async function updateProduct(id, payload) {
  const { imageFile, ...rest } = payload;
  const update = { ...rest };

  if (imageFile) {
    // remove old file if any
    const prev = await getProduct(id);
    if (prev.image_path) await removeImageByPath(prev.image_path);

    const up = await uploadProductImage(imageFile);
    update.image_url = up.publicUrl;
    update.image_path = up.path;
  }

  const { data, error } = await supabase
    .from('products')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a product and its storage object. */
export async function deleteProduct(id) {
  const prev = await getProduct(id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  if (prev?.image_path) await removeImageByPath(prev.image_path);
}
