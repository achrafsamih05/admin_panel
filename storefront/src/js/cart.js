// A tiny localStorage-backed cart store with a pub/sub API.
// Shape: { [productId]: { id, name, price, image_url, quantity } }
const KEY = 'estrave_cart_v1';
const listeners = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}
function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
}

// React to updates coming from OTHER tabs as well.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) listeners.forEach((fn) => fn(read()));
});

export const cart = {
  get: () => read(),
  subscribe(fn) { listeners.add(fn); fn(read()); return () => listeners.delete(fn); },

  add(product, qty = 1) {
    const s = read();
    const line = s[product.id] || {
      id: product.id, name: product.name, price: Number(product.price),
      image_url: product.image_url, quantity: 0,
    };
    line.quantity += qty;
    s[product.id] = line;
    write(s);
  },
  setQuantity(id, qty) {
    const s = read();
    if (!s[id]) return;
    if (qty <= 0) delete s[id]; else s[id].quantity = qty;
    write(s);
  },
  remove(id) { const s = read(); delete s[id]; write(s); },
  clear()    { write({}); },

  items()    { return Object.values(read()); },
  count()    { return Object.values(read()).reduce((n, l) => n + l.quantity, 0); },
  subtotal() { return Object.values(read()).reduce((n, l) => n + l.price * l.quantity, 0); },
};

/** Keep every element with `[data-cart-count]` in sync with the badge. */
export function bindCartBadge() {
  const update = () => {
    const n = cart.count();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = n > 99 ? '99+' : String(n);
      el.style.display = n > 0 ? '' : 'none';
    });
  };
  cart.subscribe(update);
}
