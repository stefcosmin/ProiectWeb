/* =============================================
   StockPro — app.js
   Utilitar global: configuratie API, AJAX,
   toast notifications, helpers comuni
   FIX MOBIL: sidebar toggle cu overlay
   ============================================= */

/* ---------- Configuratie API ---------- */
const API_BASE = '/api';

/**
 * Apel AJAX generic catre API
 * @param {string} endpoint - calea relativa (ex: '/items')
 * @param {string} method   - GET | POST | PUT | DELETE
 * @param {object|null} body - datele trimise (optional)
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(API_BASE + endpoint, options);

    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Eroare server' }));
        throw new Error(err.message || 'Eroare necunoscuta');
    }

    return response.json();
}

/* ---------- Toast Notifications ---------- */

/**
 * Afiseaza un mesaj toast
 * @param {string} message
 * @param {'success'|'error'|'warning'|''} type
 * @param {number} duration - ms pana dispare
 */
function showToast(message, type = '', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' toast--' + type : '');
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity    = '0';
        toast.style.transform  = 'translateX(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ---------- Data formatata ---------- */

/**
 * Returneaza data curenta formatata in romana
 */
function getDataRomana() {
    return new Date().toLocaleDateString('ro-RO', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric'
    });
}

/* ---------- Stare badge stoc ---------- */

/**
 * Determina starea unui articol
 * @param {number} quantity
 * @param {number} min_threshold
 * @returns {{ label: string, cls: string }}
 */
function getStareBadge(quantity, min_threshold) {
    if (quantity <= 0) {
        return { label: 'Epuizat',    cls: 'badge badge--danger' };
    }
    if (quantity <= min_threshold) {
        return { label: 'Stoc redus', cls: 'badge badge--warning' };
    }
    return { label: 'OK',             cls: 'badge badge--ok' };
}

/* ---------- Escape XSS ---------- */

/**
 * Escapeaza HTML pentru a preveni XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

/* ---------- Sidebar toggle mobil — FIX ---------- */
document.addEventListener('DOMContentLoaded', () => {

    /* Data in topbar */
    const dateEl = document.getElementById('topbar-date');
    if (dateEl) {
        dateEl.textContent = getDataRomana();
    }

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar    = document.getElementById('sidebar');
    if (!menuToggle || !sidebar) return;

    /* Cream overlay dinamic pentru inchidere sidebar */
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id        = 'sidebar-overlay';
    document.body.appendChild(overlay);

    /* Deschide / inchide sidebar */
    menuToggle.addEventListener('click', (e) => {
        /* stopPropagation previne inchiderea imediata de catre document listener */
        e.stopPropagation();
        const esteOpen = sidebar.classList.contains('open');
        if (esteOpen) {
            inchideSidebar();
        } else {
            deschideSidebar();
        }
    });

    /* Inchide la click pe overlay */
    overlay.addEventListener('click', () => {
        inchideSidebar();
    });

    /* Inchide la click pe un link din sidebar (navigare pe mobil) */
    sidebar.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                inchideSidebar();
            }
        });
    });

    function deschideSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; /* previne scroll body cand sidebar e deschis */
    }

    function inchideSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});