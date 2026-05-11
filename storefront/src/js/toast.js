// A tiny, dependency-free toast popping out of the bottom-left corner.
// Purpose: surface Supabase/network errors without the user having to open
// the browser console.

let container;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'sf-toast-container';
  document.body.appendChild(container);
  return container;
}

export function toast(message, { variant = 'danger', timeout = 5000 } = {}) {
  const el = document.createElement('div');
  el.className = `sf-toast sf-toast-${variant}`;
  el.setAttribute('role', variant === 'danger' ? 'alert' : 'status');
  el.textContent = message;
  ensureContainer().appendChild(el);
  // Force a reflow so the transition fires.
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.classList.add('sf-toast-in');

  const remove = () => {
    el.classList.remove('sf-toast-in');
    setTimeout(() => el.remove(), 200);
  };
  setTimeout(remove, timeout);
  el.addEventListener('click', remove);
  return remove;
}

export const toastError   = (msg) => toast(msg, { variant: 'danger' });
export const toastSuccess = (msg) => toast(msg, { variant: 'success' });
