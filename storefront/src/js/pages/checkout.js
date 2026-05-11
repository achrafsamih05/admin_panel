// Checkout controller.
// KEY REQUIREMENT: the user does NOT enter an address here.
// We read the saved shipping address from their profile, and if it's missing
// we send them to profile.html to fill it in first.

import { supabase, requireAuth } from '../supabaseClient.js';
import { getMyProfile, hasShippingAddress } from '../profile.js';
import { cart } from '../cart.js';

const $ = (sel) => document.querySelector(sel);

const fmtPrice = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    .format(Number(n || 0));

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

function renderAddress(p) {
  const box = $('#shippingAddress');
  if (!box) return;
  const lines = [
    p.full_name,
    p.address_line1,
    p.address_line2,
    [p.city, p.state, p.zip_code].filter(Boolean).join(', '),
    p.country,
    p.phone,
  ].filter(Boolean);
  box.innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
}

function renderOrderSummary() {
  const list = $('#summaryList');
  if (!list) return;
  const items = cart.items();
  list.innerHTML = items.map((l) => `
    <li class="d-flex justify-content-between py-1">
      <span class="text-truncate pe-2">
        ${escapeHtml(l.name)} <span class="text-secondary">× ${l.quantity}</span>
      </span>
      <span>${fmtPrice(l.price * l.quantity)}</span>
    </li>
  `).join('');
  $('#summaryTotal').textContent = fmtPrice(cart.subtotal());
}

async function placeOrder(profile) {
  const items = cart.items();
  if (!items.length) throw new Error('Your cart is empty.');

  // 1) create the order row — RLS policy allows user_id = auth.uid()
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: profile.id,
      status: 'pending',
      total:  cart.subtotal(),
      ship_full_name:     profile.full_name,
      ship_phone:         profile.phone,
      ship_address_line1: profile.address_line1,
      ship_address_line2: profile.address_line2,
      ship_city:          profile.city,
      ship_state:         profile.state,
      ship_zip_code:      profile.zip_code,
      ship_country:       profile.country,
    })
    .select()
    .single();
  if (orderErr) throw orderErr;

  // 2) insert the line items (one row per product). `line_total` is
  //    a generated column in the DB — we don't set it here.
  const rows = items.map((l) => ({
    order_id:   order.id,
    product_id: l.id,
    name:       l.name,
    price:      l.price,
    quantity:   l.quantity,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(rows);
  if (itemsErr) throw itemsErr;

  return order;
}

async function init() {
  const form = $('#placeOrderForm');
  if (!form) return;                      // not the checkout page

  const session = await requireAuth();
  if (!session) return;

  // If the cart is empty, skip straight back to the shop.
  if (!cart.items().length) {
    window.location.replace('cart.html');
    return;
  }

  const profile = await getMyProfile();

  // --- the critical guard: no address => send them to profile.html ---
  if (!hasShippingAddress(profile)) {
    $('#addressReady')?.classList.add('d-none');
    $('#addressMissing')?.classList.remove('d-none');
    form.querySelector('button[type=submit]').disabled = true;
  } else {
    renderAddress(profile);
  }

  renderOrderSummary();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2 animate-spin me-1"></i>Placing order…';
    try {
      const order = await placeOrder(profile);
      cart.clear();
      window.location.replace(`order-confirmation.html?id=${order.id}`);
    } catch (err) {
      console.error(err);
      alert(`Could not place the order: ${err.message}`);
      btn.disabled = false;
      btn.innerHTML = 'Place order';
    }
  });
}

init();
