// "Add Product" form controller.
import { requireAdmin } from '../supabaseClient.js';
import { createProduct, listCategories } from '../products.js';

const $ = (sel) => document.querySelector(sel);

async function init() {
  const form = $('#addProductForm');
  if (!form) return;                       // not this page

  const admin = await requireAdmin();
  if (!admin) return;

  // Replace the hard-coded <select> options with live categories.
  try {
    const cats = await listCategories();
    const sel  = $('#productCategory');
    if (sel) {
      sel.innerHTML =
        `<option value="">Select category</option>` +
        cats.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  } catch (e) {
    console.warn('[create-product] could not load categories', e);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const imageFile = $('#productImage').files[0] || null;
      await createProduct({
        name:        $('#productName').value.trim(),
        sku:         $('#productSKU').value.trim() || null,
        price:       Number($('#productPrice').value),
        stock:       Number($('#productStock').value),
        category_id: $('#productCategory').value || null,
        description: $('#productDescription').value.trim() || null,
        is_active:   true,
        imageFile,
      });
      // Redirect back to the inventory list on success.
      window.location.href = 'inventory.html';
    } catch (err) {
      console.error(err);
      alert(`Could not add product: ${err.message}`);
      btn.disabled = false; btn.textContent = 'Add Product';
    }
  });
}

init();
