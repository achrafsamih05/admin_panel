// Import Bootstrap JS
import * as bootstrap from 'bootstrap';
import './custom.js';

// Import SCSS
import '../scss/style.scss';

// Loader lifecycle. Imported FIRST so its DOMContentLoaded listener is
// registered before any page controller starts an async fetch.
import './loader.js';

// Page controllers. Each one self-gates to its own page by checking for a
// unique DOM element, so importing them globally is safe and keeps the HTML
// clean (no per-page <script> tags).
import './pages/admin-auth.js';
import './pages/inventory.js';
import './pages/create-product.js';
import './pages/setting.js';
import './pages/orders.js';