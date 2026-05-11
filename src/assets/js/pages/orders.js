// Admin Orders page (command.html) controller.
import * as bootstrap from 'bootstrap';
import { requireAdmin } from '../supabaseClient.js';
import { listOrders, updateOrderStatus, deleteOrder } from '../orders.js';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmtPrice = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    .format(Number(n || 0));

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
  });
};

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[c]);

// Bootstrap badge class per status.
const STATUS_BADGE = {
  pending:   'bg-warning-subtle text-warning',
  paid:      'bg-info-subtle text-info',
  shipped:   'bg-primary-subtle text-primary',
  delivered: 'bg-success-subtle text-success',
  cancelled: 'bg-danger-subtle text-danger',
};

// Initials for the avatar bubble, derived from the shipping name.
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

const state = {
  rows: [],
  search: '',
  status: '',
  selectedId: null,
};

/* -------- render -------- */

function renderRows() {
  const tbody = $('#ordersTbody');
  if (!tbody) return;
  if (!state.rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="text-center text-secondary py-5">
        No orders match the current filter.
      </td></tr>`;
    return;
  }
  tbody.innerHTML = state.rows.map((o) => {
    const itemCount = (o.order_items ?? []).reduce((n, i) => n + (i.quantity || 0), 0);
    const badge = STATUS_BADGE[o.status] || 'bg-secondary-subtle text-secondary';
    return `
    <tr data-id="${o.id}">
      <td class="px-4">
        <div class="d-flex align-items-center">
          <div class="avatar avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-3"
               style="width:40px;height:40px;">
            ${escapeHtml(initials(o.ship_full_name))}
          </div>
          <span class="fw-semibold text-dark">${escapeHtml(o.ship_full_name || 'Guest')}</span>
        </div>
      </td>
      <td><span class="text-secondary small fw-medium">#${escapeHtml(String(o.id).slice(0, 8))}</span></td>
      <td>${escapeHtml(fmtDate(o.created_at))}</td>
      <td>${itemCount} ${itemCount === 1 ? 'Product' : 'Products'}</td>
      <td class="fw-bold">${fmtPrice(o.total)}</td>
      <td><span class="badge rounded-pill ${badge} px-3">${escapeHtml(o.status)}</span></td>
      <td class="text-end px-4">
        <button class="btn btn-sm btn-light text-primary me-1 js-view" title="View details">
          <i class="ti ti-eye fs-5"></i>
        </button>
        <button class="btn btn-sm btn-light text-danger js-delete" title="Delete">
          <i class="ti ti-trash fs-5"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function renderError(msg) {
  const tbody = $('#ordersTbody');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td colspan="7" class="text-center text-danger py-5">
      <i class="ti ti-alert-triangle me-2"></i>Couldn't load orders: ${escapeHtml(msg)}
    </td></tr>`;
}

async function reload() {
  const tbody = $('#ordersTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-4">
        <i class="ti ti-loader-2 animate-spin me-2"></i>Loading…
      </td></tr>`;
  }
  try {
    state.rows = await listOrders({ search: state.search, status: state.status });
    renderRows();
  } catch (e) {
    console.error('[orders] listOrders failed:', e);
    renderError(e.message || 'unknown error');
  }
}

/* -------- modal -------- */

function fillModal(order) {
  state.selectedId = order.id;
  $('#odmOrderId').textContent = '#' + String(order.id).slice(0, 8);

  const ship = [
    order.ship_full_name,
    order.ship_address_line1,
    order.ship_address_line2,
    [order.ship_city, order.ship_state, order.ship_zip_code].filter(Boolean).join(', '),
    order.ship_country,
    order.ship_phone,
  ].filter(Boolean);
  $('#odmShipping').innerHTML = ship.length
    ? ship.map((l) => `<div>${escapeHtml(l)}</div>`).join('')
    : '<span class="text-secondary">No shipping info captured.</span>';

  const items = order.order_items ?? [];
  const body  = $('#odmItems');
  body.innerHTML = items.length ? items.map((i) => `
    <tr>
      <td>${escapeHtml(i.name)}</td>
      <td class="text-center">${i.quantity}</td>
      <td class="text-end fw-bold">${fmtPrice(i.line_total ?? i.price * i.quantity)}</td>
    </tr>
  `).join('') : `
    <tr><td colspan="3" class="text-center text-secondary py-3">No line items.</td></tr>`;

  const subtotal = items.reduce((n, i) => n + Number(i.line_total ?? i.price * i.quantity), 0);
  $('#odmSubtotal').textContent = fmtPrice(subtotal);
  $('#odmTotal').textContent    = fmtPrice(order.total);
  $('#odmStatus').textContent   = order.status;
  $('#odmStatusSelect').value   = order.status;
}

async function handleSaveStatus() {
  if (!state.selectedId) return;
  const btn    = $('#odmSave');
  const select = $('#odmStatusSelect');
  const next   = select.value;
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await updateOrderStatus(state.selectedId, next);
    bootstrap.Modal.getInstance('#orderDetailsModal')?.hide();
    await reload();
  } catch (e) {
    alert(`Could not update status: ${e.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Save status';
  }
}

/* -------- table clicks -------- */

async function handleTbodyClick(e) {
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  const id    = row.dataset.id;
  const order = state.rows.find((o) => o.id === id);
  if (!order) return;

  if (e.target.closest('.js-view')) {
    fillModal(order);
    bootstrap.Modal.getOrCreateInstance('#orderDetailsModal').show();
    return;
  }
  if (e.target.closest('.js-delete')) {
    if (!confirm(`Delete order #${String(id).slice(0, 8)}?`)) return;
    try {
      await deleteOrder(id);
      await reload();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }
}

/* -------- init -------- */

async function init() {
  if (!$('#ordersTbody')) return;   // not the orders page

  const admin = await requireAdmin();
  if (!admin) return;

  // Search (debounced) + status filter
  let t;
  $('#ordersSearch')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    clearTimeout(t); t = setTimeout(reload, 250);
  });
  $('#ordersStatusFilter')?.addEventListener('change', (e) => {
    state.status = e.target.value;
    reload();
  });

  $('#ordersTbody')?.addEventListener('click', handleTbodyClick);
  $('#odmSave')?.addEventListener('click', handleSaveStatus);

  await reload();
}

init();
