// Storefront signin / signup controllers (both live on separate HTML pages,
// each controller self-gates by looking for its form id).
import { supabase } from '../supabaseClient.js';

const $ = (sel) => document.querySelector(sel);

function showAlert(variant, msg) {
  const slot = $('#authAlert');
  if (!slot) return;
  slot.innerHTML = `<div class="alert alert-${variant} py-2 small mb-3">${msg}</div>`;
}

function safeNext() {
  // `?next=profile.html` preserved by requireAuth(). Only allow relative paths
  // so we can't be redirected to a phishing URL.
  const raw = new URLSearchParams(location.search).get('next') || 'index.html';
  if (/^https?:/i.test(raw) || raw.startsWith('//')) return 'index.html';
  return raw;
}

/* ---------- Sign in ---------- */
(function initSignIn() {
  const form = $('#signinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const email    = $('#email').value.trim();
    const password = $('#password').value;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Sign in';

    if (error) return showAlert('danger', error.message);
    window.location.replace(safeNext());
  });
})();

/* ---------- Sign up ---------- */
(function initSignUp() {
  const form = $('#signupForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const full_name = $('#fullName').value.trim();
    const email     = $('#email').value.trim();
    const password  = $('#password').value;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account…';

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name } },
    });
    btn.disabled = false; btn.textContent = 'Create account';

    if (error) return showAlert('danger', error.message);

    // If the project requires email confirmation, `session` will be null and
    // we should tell the user to check their inbox. Otherwise, redirect.
    if (!data.session) {
      showAlert(
        'success',
        'Account created. Please confirm your email, then sign in.'
      );
      return;
    }
    window.location.replace('profile.html?welcome=1');
  });
})();
