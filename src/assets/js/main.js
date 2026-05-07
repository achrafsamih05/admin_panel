

// Import Bootstrap JS
import * as bootstrap from 'bootstrap';
import './custom.js';


// Import SCSS
import '../scss/style.scss';

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