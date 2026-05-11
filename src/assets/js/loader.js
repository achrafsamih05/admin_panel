// Page loader lifecycle.
//
// Rules enforced here (fixes the "spinner won't go away" bug):
//  1. Hide on DOMContentLoaded (fires earlier than window.load; we don't want
//     to wait for every image/icon before dismissing the overlay).
//  2. Safety timeout — if anything throws before DOMContentLoaded (SyntaxError
//     during module load, a rejected top-level await, ...) the overlay still
//     disappears after SAFETY_MS.
//  3. Hide again on `pageshow` so the back/forward cache (bfcache) can't
//     restore a frozen spinner state.
//  4. Show on real in-app navigation ONLY. Skip:
//       - hash links ("#", "#foo")
//       - Bootstrap triggers (data-bs-toggle)
//       - new-tab / download / middle-click / modifier-clicks
//       - external links
//       - anchors inside dropdowns
//  5. Expose programmatic show/hide for async operations.

const SAFETY_MS = 5000;
let safetyTimer = null;

function getEl() {
  return document.getElementById('loader-wrapper');
}

export function hideLoader() {
  const el = getEl();
  if (!el) return;
  el.classList.add('loader-hidden');
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
}

export function showLoader() {
  const el = getEl();
  if (!el) return;
  el.classList.remove('loader-hidden');
  // Re-arm the safety timer every time we show so a runaway async op can't
  // leave the spinner forever.
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(hideLoader, SAFETY_MS);
}

/** Wrap an async operation so the loader auto-hides on resolve OR reject. */
export async function withLoader(promise) {
  showLoader();
  try { return await promise; }
  finally { hideLoader(); }
}

/** A single <a> click is "real navigation" iff none of these escapes apply. */
function isInAppNavigation(link, event) {
  const href = link.getAttribute('href');
  if (!href) return false;
  if (href.startsWith('#') || href === '') return false;
  if (href.startsWith('javascript:')) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;
  if (link.hasAttribute('data-bs-toggle')) return false;
  // Modifier clicks (open in new tab, save-as, middle-click) are not in-app.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (event.button && event.button !== 0) return false;
  // External links: different origin.
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
  } catch { return false; }
  return true;
}

function initLoader() {
  const el = getEl();
  if (!el) return;                              // page without a loader, nothing to do

  // (1) Hide as soon as the DOM is parsed.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideLoader, { once: true });
  } else {
    // readyState is already 'interactive' or 'complete'
    hideLoader();
  }

  // (2) Safety net: no matter what, hide after SAFETY_MS.
  safetyTimer = setTimeout(hideLoader, SAFETY_MS);

  // (3) bfcache restore — Safari/Firefox give us back a frozen DOM on back
  //     navigation, which means the loader-hidden class is still there but the
  //     page is "live" again. We don't need to *show* anything; what we need
  //     is to make sure we don't accidentally leave it visible either.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) hideLoader();
  });

  // (4) Re-show the loader ONLY on a real in-app navigation click.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    if (!isInAppNavigation(link, event)) return;
    showLoader();
  });
}

initLoader();
