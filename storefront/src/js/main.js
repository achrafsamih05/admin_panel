// Storefront common bundle — every HTML page loads this module.
import * as bootstrap from 'bootstrap';
import '../scss/style.scss';

import { bindCartBadge } from './cart.js';

// Page-specific controllers. Each one self-gates to its page, so importing
// them globally is safe and keeps the HTML clean.
import './pages/home.js';
import './pages/auth.js';
import './pages/profile.js';
import './pages/cart-page.js';
import './pages/checkout.js';

// Start the global cart badge sync.
bindCartBadge();
