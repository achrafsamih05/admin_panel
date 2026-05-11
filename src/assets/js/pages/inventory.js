// Inventory page controller: live product list + edit/delete modal.
import * as bootstrap from 'bootstrap';
import { requireAdmin } from '../supabaseClient.js';
import {
  listProducts, listCategories, updateProduct, deleteProduct,
} from '../products.js';

const fmtPrice = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n || 0));

const state = {
  search: '',
  categoryId: null,
  rows: [],
  categories: [],
};

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function renderRows() {
  const tbody = $('#inventoryTbody');
  if (!state.rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-secondary py-5">
        No products found. <a href="create-product.html">Add your first product</a>.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = state.rows.map((p) => `
    <tr class="align-middle" data-id="${p.id}">
      <td>
        <div class="d-flex align-items-center">
          <img src="${p.image_url || './assets/images/product-1.png'}"
               alt="${escapeHtml(p.name)}" class="avatar avatar-md rounded" />
          <span class="ms-3">${escapeHtml(p.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(p.sku || '—')}</td>
      <td>${escapeHtml(p.categories?.name || '—')}</td>
      <td>—</td>
      <td>${fmtPrice(p.price)}</td>
      <td>pcs</td>
      <td>${p.stock ?? 0}</td>
      <td>
        <a href="#" class="js-edit" title="Edit"><i class="ti ti-edit"></i></a>
        <a href="#" class="link-danger js-delete ms-2" title="Delete"><i class="ti ti-trash"></i></a>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[c]);
}

async function reload() {
  const tbody = $('#inventoryTbody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><i class="ti ti-loader-2 animate-spin me-2"></i>Loading…</td></tr>`;
  try {
    const { rows } = await listProducts({ search: state.search, categoryId: state.categoryId });
    state.rows = rows;
    renderRows();
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-4">Failed to load products: ${escapeHtml(e.message)}</td></tr>`;
  }
}

/* -------- edit modal -------- */
function openEditModal(product) {
  const form = $('#editProductForm');
  form.dataset.id = product.id;
  form.elements.name.value        = product.name ?? '';
  form.elements.sku.value         = product.sku ?? '';
  form.elements.price.value       = product.price ?? 0;
  form.elements.stock.value       = product.stock ?? 0;
  form.elements.category_id.value = product.category_id ?? '';
  form.elements.description.value = product.description ?? '';
  form.elements.image.value       = '';
  bootstrap.Modal.getOrCreateInstance('#editProductModal').show();
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const id   = form.dataset.id;
  const btn  = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const file = form.elements.image.files[0] || null;
    await updateProduct(id, {
      name:        form.elements.name.value.trim(),
      sku:         form.elements.sku.value.trim() || null,
      price:       Number(form.elements.price.value),
      stock:       Number(form.elements.stock.value),
      category_id: form.elements.category_id.value || null,
      description: form.elements.description.value.trim() || null,
      imageFile:   file,
    });
    bootstrap.Modal.getInstance('#editProductModal')?.hide();
    await reload();
  } catch (err) {
    alert(`Save failed: ${err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Save changes';
  }
}

async function handleTbodyClick(e) {
  const editLink   = e.target.closest('.js-edit');
  const deleteLink = e.target.closest('.js-delete');
  if (!editLink && !deleteLink) return;
  e.preventDefault();

  const row = e.target.closest('tr[data-id]');
  const id  = row?.dataset.id;
  const product = state.rows.find((p) => p.id === id);
  if (!product) return;

  if (editLink) return openEditModal(product);

  if (deleteLink) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      await reload();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }
}

async function init() {
  if (!document.getElementById('inventoryTbody')) return; // not the inventory page

  const admin = await requireAdmin();
  if (!admin) return;

  // populate filters (category select in edit modal + optional filter)
  state.categories = await listCategories();
  const catSelect = $('#editProductForm select[name=category_id]');
  if (catSelect) {
    catSelect.innerHTML = `<option value="">Uncategorised</option>` +
      state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }

  $('#inventorySearch')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    clearTimeout(init._t); init._t = setTimeout(reload, 250);
  });

  $('#inventoryTbody')?.addEventListener('click', handleTbodyClick);
  $('#editProductForm')?.addEventListener('submit', handleEditSubmit);

  await reload();
}

init();
