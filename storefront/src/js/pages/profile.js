// Customer profile page controller — loads & saves the shipping address
// that checkout will read.
import { supabase, requireAuth } from '../supabaseClient.js';
import { getMyProfile, updateMyProfile } from '../profile.js';
import { toastError, toastSuccess } from '../toast.js';

const $ = (sel) => document.querySelector(sel);

async function init() {
  const form = $('#profileForm');
  if (!form) return;

  // Redirect to signin if not logged in (preserves `next=profile.html`).
  const session = await requireAuth();
  if (!session) return;

  // Optional welcome banner for people who just signed up.
  if (new URLSearchParams(location.search).get('welcome') === '1') {
    $('#welcomeAlert')?.classList.remove('d-none');
  }

  $('#accountEmail').textContent = session.user.email || '';

  // Prefill the form.
  try {
    const p = await getMyProfile();
    if (p) {
      for (const [k, el] of [
        ['full_name',    $('#fullName')],
        ['phone',        $('#phone')],
        ['address_line1',$('#address1')],
        ['address_line2',$('#address2')],
        ['city',         $('#city')],
        ['state',        $('#state')],
        ['zip_code',     $('#zip')],
        ['country',      $('#country')],
      ]) {
        if (el) el.value = p[k] ?? '';
      }
    }
  } catch (e) {
    console.error('[profile] load failed', e);
    toastError(`Couldn't load your profile: ${e.message || 'connection error'}`);
  }

  // Save changes
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      await updateMyProfile({
        full_name:     $('#fullName').value.trim() || null,
        phone:         $('#phone').value.trim()    || null,
        address_line1: $('#address1').value.trim() || null,
        address_line2: $('#address2').value.trim() || null,
        city:          $('#city').value.trim()     || null,
        state:         $('#state').value.trim()    || null,
        zip_code:      $('#zip').value.trim()      || null,
        country:       $('#country').value.trim()  || null,
      });
      btn.classList.add('btn-success');
      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.classList.remove('btn-success'); btn.textContent = 'Save changes'; btn.disabled = false; }, 1400);
    } catch (err) {
      toastError(`Save failed: ${err.message || 'connection error'}`);
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  });

  // Sign out
  $('#signOutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('index.html');
  });
}

init();
