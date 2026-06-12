const API_BASE = '/api';

//apel AJAX generic catre API
async function apiFetch(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    //convertire din ?request= in /...
    let path = endpoint;
    if (path.startsWith('?request=')) {
        path = '/' + path.substring(9);
    } else if (!path.startsWith('/')) {
        path = '/' + path;
    }

    const response = await fetch(API_BASE + path, options);

    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Eroare server' }));
        throw new Error(err.message || 'Eroare necunoscuta');
    }

    return response.json();
}

//mesaj toast
function showToast(message, type = '', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' toast--' + type : '');
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

//returneaza data curenta formatata
function getDataRomana() {
    return new Date().toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

//badge stoc

//determina starea unui articol
function getStareBadge(quantity, min_threshold) {
    if (quantity <= 0) {
        return { label: 'Epuizat', cls: 'badge badge--danger' };
    }
    if (quantity <= min_threshold) {
        return { label: 'Stoc redus', cls: 'badge badge--warning' };
    }
    return { label: 'OK', cls: 'badge badge--ok' };
}

//escape la  HTML pentru a preveni XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

//sidebar toggle hamburger mobil
document.addEventListener('DOMContentLoaded', () => {

    const dateEl = document.getElementById('topbar-date');
    if (dateEl) {
        dateEl.textContent = getDataRomana();
    }

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!menuToggle || !sidebar) return;

    //overlay dinamic pt inchidere sidebar
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Deschide / inchide sidebar
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const esteOpen = sidebar.classList.contains('open');
        if (esteOpen) {
            inchideSidebar();
        } else {
            deschideSidebar();
        }
    });

    //inchide la click pe overlay
    overlay.addEventListener('click', () => {
        inchideSidebar();
    });

    //inchide la click pe un link din sidebar (navigare pe mobil)
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
        document.body.style.overflow = 'hidden'; //previne scroll body cand sidebar e deschis
    }

    function inchideSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});