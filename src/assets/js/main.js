

// Import Bootstrap JS
import * as bootstrap from 'bootstrap';
import './custom.js';

// Import SCSS
import '../scss/style.scss';

// Page controllers. Each one self-gates to its own page by checking for a
// unique DOM element, so importing them globally is safe and keeps the HTML
// clean (no per-page <script> tags).
import './pages/admin-auth.js';
import './pages/inventory.js';
import './pages/create-product.js';
import './pages/setting.js';

// src/assets/js/main.js

export function initLoader() {
    const loader = document.getElementById('loader-wrapper');
    
    if (loader) {
        // إخفاء اللودر عند اكتمال تحميل النافذة
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('loader-hidden');
            }, 400);
        });

        // إظهار اللودر عند الضغط على الروابط للتنقل السلس
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && !href.startsWith('#') && !this.target && this.hostname === window.location.hostname) {
                    loader.classList.remove('loader-hidden');
                }
            });
        });
    }
}

// تشغيل الدالة
initLoader();