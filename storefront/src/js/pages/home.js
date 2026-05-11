// Home page controller: loads categories + products, wires search & filtering.
import { listCategories, listProducts } from '../catalog.js';
import { cart } from '../cart.js';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  categoryId: null,     // null === "All"
  search: '',
};

const fmtPrice = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    .format(Number(n || 0));

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

function placeholderImage() {
  // Tiny SVG rendered inline to avoid a failed image request when a product
  // has no uploaded picture yet.
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="%23f5f5f5"/>
      <text x="50%" y="50%" fill="%23a3a3a3" font-family="sans-serif"
            font-size="14" text-anchor="middle" dominant-baseline="middle">
        No image
      </text>
    </svg>`);
}

/* ---------- renderers ---------- */

function renderCategories(cats) {
  const rail = $('#categoryRail');
  if (!rail) return;
  const chips = [
    `<button type="button" class="category-chip active" data-category="">All</button>`,
    ...cats.map((c) =>
      `<button type="button" class="category-chip" data-category="${c.id}">${escapeHtml(c.name)}</button>`
    ),
  ].join('');
  rail.innerHTML = chips;

  rail.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    $$('.category-chip', rail).forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.categoryId = chip.dataset.category || null;
    reloadProducts();
  });
}

function renderProducts(rows) {
  const grid  = $('#productGrid');
  const empty = $('#emptyState');
  if (!grid || !empty) return;

  if (!rows.length) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  grid.innerHTML = rows.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <a href="product.html?id=${p.id}" class="product-thumb text-decoration-none">
        <img src="${p.image_url || placeholderImage()}"
             alt="${escapeHtml(p.name)}" loading="lazy"
             onerror="this.src='${placeholderImage()}'">
      </a>
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <div class="text-secondary small">${escapeHtml(p.categories?.name ?? '')}</div>
        <div class="product-price">${fmtPrice(p.price)}</div>
        <button type="button"
                class="btn btn-primary btn-sm product-add js-add"
                ${Number(p.stock) <= 0 ? 'disabled' : ''}>
          <i class="ti ti-plus me-1"></i>
          ${Number(p.stock) <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  `).join('');
}

/* ---------- data flow ---------- */

async function reloadProducts() {
  const grid = $('#productGrid');
  if (!grid) return;
  grid.classList.add('opacity-50');
  try {
    const rows = await listProducts({
      categoryId: state.categoryId,
      search: state.search,
    });
    renderProducts(rows);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `
      <div class="col-span-2 empty-state text-danger" style="grid-column: 1/-1;">
        <i class="ti ti-alert-triangle"></i>
        <p class="mt-2 mb-0">Couldn't load products. Check your Supabase config.</p>
      </div>`;
  } finally {
    grid.classList.remove('opacity-50');
  }
}

/* ---------- init ---------- */

async function init() {
  // Only run on the home page.
  if (!$('#productGrid') || !$('#categoryRail')) return;

  // Categories + first page of products in parallel.
  try {
    const [cats] = await Promise.all([listCategories(), reloadProducts()]);
    renderCategories(cats);
  } catch (e) {
    console.warn('[home] categories failed', e);
  }

  // Debounced search
  const input = $('#storeSearch');
  if (input) {
    let t;
    input.addEventListener('input', (e) => {
      state.search = e.target.value;
      clearTimeout(t);
      t = setTimeout(reloadProducts, 250);
    });
  }

  // Event delegation for Add-to-cart buttons
  $('#productGrid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-add');
    if (!btn) return;
    const card = btn.closest('.product-card');
    const id   = card?.dataset.id;
    if (!id) return;

    // Use the already-loaded card's data to avoid another round-trip.
    const name  = card.querySelector('.product-name')?.textContent.trim() ?? '';
    const price = parseFloat(card.querySelector('.product-price')?.textContent.replace(/[^\d.]/g, '')) || 0;
    const img   = card.querySelector('.product-thumb img')?.getAttribute('src') ?? null;

    cart.add({ id, name, price, image_url: img }, 1);

    // micro-feedback
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check me-1"></i>Added';
    setTimeout(() => { btn.innerHTML = label; btn.disabled = false; }, 900);
  });
}

init();
