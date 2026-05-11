// Admin "Account Settings" page — loads/saves the admin's profile row.
import { supabase, requireAdmin } from '../supabaseClient.js';

const $ = (sel) => document.querySelector(sel);

async function init() {
  const form = $('#formAccountSettings');
  if (!form) return;
  const profile = await requireAdmin();
  if (!profile) return;

  // Split full_name into first/last for the existing inputs.
  const [firstName = '', ...rest] = (profile.full_name || '').split(' ');
  const lastName = rest.join(' ');
  const setVal = (id, v) => { const el = $('#' + id); if (el) el.value = v ?? ''; };

  setVal('firstName', firstName);
  setVal('lastName',  lastName);
  setVal('email',     (await supabase.auth.getUser()).data.user?.email ?? '');
  setVal('phoneNumber', profile.phone);
  setVal('address',   profile.address_line1);
  setVal('state',     profile.state);
  setVal('zipCode',   profile.zip_code);
  const country = $('#country');
  if (country && profile.country) country.value = profile.country;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving…';

    const full_name = [$('#firstName').value.trim(), $('#lastName').value.trim()]
      .filter(Boolean).join(' ');

    const { error } = await supabase.from('profiles').update({
      full_name,
      phone:         $('#phoneNumber').value.trim() || null,
      address_line1: $('#address').value.trim() || null,
      state:         $('#state').value.trim() || null,
      zip_code:      $('#zipCode').value.trim() || null,
      country:       $('#country').value || null,
    }).eq('id', profile.id);

    btn.disabled = false; btn.textContent = 'Save changes';
    if (error) {
      alert(`Save failed: ${error.message}`);
    } else {
      // Tiny non-intrusive success indicator.
      btn.classList.add('btn-success');
      btn.textContent = 'Saved ✓';
      setTimeout(() => {
        btn.classList.remove('btn-success');
        btn.textContent = 'Save changes';
      }, 1500);
    }
  });
}

init();
