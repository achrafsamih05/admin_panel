// Orders data access (admin). The RLS policy "orders admin update" allows
// admins to update any order; regular users only see their own.
import { supabase } from './supabaseClient.js';

/**
 * List orders with optional search + status filter. Customer name is pulled
 * from the order's snapshot (ship_full_name) since we always stamp it at
 * checkout. Falls back to an item count from the related `order_items`.
 *
 * @param {{ search?: string, status?: string|null, limit?: number }} opts
 */
export async function listOrders(opts = {}) {
  const { search = '', status = null, limit = 100 } = opts;

  let q = supabase
    .from('orders')
    .select(`
      id, status, total, created_at,
      ship_full_name, ship_phone,
      ship_address_line1, ship_address_line2,
      ship_city, ship_state, ship_zip_code, ship_country,
      order_items ( id, name, price, quantity, line_total )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  if (!search.trim()) return rows;

  // Cheap client-side filter. For a bigger dataset we'd push this server-side
  // via ilike on ship_full_name + a UUID-prefix match on id.
  const needle = search.trim().toLowerCase();
  return rows.filter((o) =>
    (o.ship_full_name ?? '').toLowerCase().includes(needle) ||
    String(o.id).toLowerCase().includes(needle),
  );
}

/** Change an order's status. RLS: admin-only. */
export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete an order (cascades to order_items via FK). */
export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}
