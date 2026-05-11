// Cart page controller: renders line items with qty stepper + remove.
import { cart } from '../cart.js';

const $ = (sel) => document.querySelector(sel);

const fmtPrice = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    .format(Number(n || 0));

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

function render() {
  const list     = $('#cartList');
  const body     = $('#cartBody');
  const summary  = $('#cartSummary');
  const empty    = $('#cartEmpty');
  const subtotal = $('#cartSubtotal');
  if (!list || !body || !summary || !empty || !subtotal) return;

  const items = cart.items();
  if (!items.length) {
    body.classList.add('d-none');
    summary.classList.add('d-none');
    empty.classList.remove('d-none');
    return;
  }

  empty.classList.add('d-none');
  body.classList.remove('d-none');
  summary.classList.remove('d-none');

  list.innerHTML = items.map((l) => `
    <li class="list-group-item d-flex align-items-center gap-3" data-id="${l.id}">
      <img src="${l.image_url || ''}"
           onerror="this.style.visibility='hidden'"
           alt="${escapeHtml(l.name)}"
           class="rounded" style="width:56px;height:56px;object-fit:cover;background:var(--bs-gray-100)">
      <div class="flex-grow-1">
        <p class="mb-1 fw-medium">${escapeHtml(l.name)}</p>
        <div class="text-secondary small">${fmtPrice(l.price)} each</div>
      </div>
      <div class="btn-group btn-group-sm" role="group" aria-label="Quantity">
        <button type="button" class="btn btn-outline-secondary js-dec">−</button>
        <span class="btn btn-outline-secondary disabled">${l.quantity}</span>
        <button type="button" class="btn btn-outline-secondary js-inc">+</button>
      </div>
      <span class="fw-semibold" style="min-width: 80px; text-align:right;">
        ${fmtPrice(l.price * l.quantity)}
      </span>
      <button type="button" class="btn btn-link text-danger p-0 ms-2 js-remove"
              aria-label="Remove">
        <i class="ti ti-trash"></i>
      </button>
    </li>
  `).join('');

  subtotal.textContent = fmtPrice(cart.subtotal());
}

function init() {
  if (!$('#cartList')) return; // not cart page
  render();
  cart.subscribe(render);

  $('#cartList')?.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const line = cart.items().find((l) => l.id === id);
    if (!line) return;

    if (e.target.closest('.js-inc'))    cart.setQuantity(id, line.quantity + 1);
    else if (e.target.closest('.js-dec')) cart.setQuantity(id, line.quantity - 1);
    else if (e.target.closest('.js-remove')) cart.remove(id);
  });
}

init();
