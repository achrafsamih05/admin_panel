// Controllers for the admin panel's own signin / signup pages.
// These use Supabase Auth directly; promotion to `admin` role must be
// done in the DB (see supabase/README.md).
import { supabase } from '../supabaseClient.js';

const $ = (sel) => document.querySelector(sel);

function showAlert(container, message, variant = 'danger') {
  if (!container) return;
  container.innerHTML =
    `<div class="alert alert-${variant} py-2 small mb-3">${message}</div>`;
}

/* ---------- sign-in ---------- */
function initSignIn() {
  // Scope the form by URL — signin.html is the only page where we want this wiring.
  if (!/signin\.html?$/i.test(location.pathname)) return;
  const form = document.querySelector('form.needs-validation');
  if (!form) return;

  // A small slot at the top of the card body for error messages.
  const slot = document.createElement('div');
  form.parentNode.insertBefore(slot, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const email    = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    const btn      = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert(slot, error.message);
      btn.disabled = false; btn.textContent = 'Sign in';
      return;
    }
    // After login, confirm the user is an admin before routing to the dashboard.
    const { data: prof } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single();
    if (prof?.role !== 'admin') {
      await supabase.auth.signOut();
      showAlert(slot, 'This account is not an admin. Ask an existing admin to promote you in Supabase.');
      btn.disabled = false; btn.textContent = 'Sign in';
      return;
    }
    window.location.replace('index.html');
  });
}

/* ---------- sign-up ---------- */
function initSignUp() {
  if (!/signup\.html?$/i.test(location.pathname)) return;
  const form = document.querySelector('form.needs-validation');
  if (!form) return;

  const slot = document.createElement('div');
  form.parentNode.insertBefore(slot, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const full_name = form.querySelector('#fullName').value.trim();
    const email     = form.querySelector('#email').value.trim();
    const password  = form.querySelector('#password').value;
    const btn       = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account…';

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name } },
    });
    if (error) {
      showAlert(slot, error.message);
      btn.disabled = false; btn.textContent = 'Sign up';
      return;
    }
    showAlert(
      slot,
      'Account created. Check your email to confirm, then ask an admin to promote your role in the profiles table.',
      'success'
    );
    btn.disabled = false; btn.textContent = 'Sign up';
  });
}

initSignIn();
initSignUp();
