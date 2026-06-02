/* =============================================
   StockPro — dashboard.js
   Logica paginii principale: incarca stats,
   articole recente, notificari, categorii
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
    incarcaDashboard();

    /* Buton refresh */
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            incarcaDashboard();
            showToast('Date actualizate', 'success');
        });
    }
});

/* ---------- Incarcare date principale ---------- */
async function incarcaDashboard() {
    try {
        /* Apeluri paralele pentru performanta */
        const [items, categories, notifications] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=categories'),
            apiFetch('?request=notifications')
        ]);

        afiseazaStats(items, categories, notifications);
        afiseazaArticoleRecente(items, categories);
        afiseazaAlerte(notifications);
        afiseazaCategorii(categories, items);
        actualizeazaBadgeNav(notifications);

    } catch (err) {
        showToast('Nu s-a putut conecta la server: ' + err.message, 'error');
        console.error('[Dashboard] Eroare:', err);
    }
}

/* ---------- Statistici (card-uri de sus) ---------- */
function afiseazaStats(items, categories, notifications) {
    /* Total articole */
    const elTotal = document.getElementById('val-total');
    if (elTotal) elTotal.textContent = items.length;

    /* Total categorii */
    const elCat = document.getElementById('val-categorii');
    if (elCat) elCat.textContent = categories.length;

    /* Articole cu stoc redus sau epuizat */
    const stocMic = (items || []).filter(i => i.quantity <= i.min_threshold);
    const elStoc = document.getElementById('val-stoc-mic');
    if (elStoc) elStoc.textContent = stocMic.length;

    /* Necesita verificare (periodic) */
    const periodic = (notifications.periodic || []).length;
    const elVerif = document.getElementById('val-verificari');
    if (elVerif) elVerif.textContent = periodic;
}

/* ---------- Tabel articole recente ---------- */
function afiseazaArticoleRecente(items, categories) {
    const tbody = document.getElementById('tbody-articole');
    if (!tbody) return;

    /* Construim un map id -> name pentru categorii */
    const catMap = {};
    (categories || []).forEach(c => { catMap[c.id] = c.name; });

    /* Luam ultimele 8 articole */
    const recente = [...(items || [])].slice(-8).reverse();

    if (recente.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Nu exista articole.</td></tr>';
        return;
    }

    tbody.innerHTML = recente.map(item => {
        const stare = getStareBadge(item.quantity, item.min_threshold);
        const catName = escapeHtml(catMap[item.category_id] || '—');
        return `
            <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${catName}</td>
                <td style="font-family: var(--font-mono)">${item.quantity}</td>
                <td><span class="${stare.cls}">${stare.label}</span></td>
            </tr>
        `;
    }).join('');
}

/* ---------- Alerte in panoul din dreapta ---------- */
function afiseazaAlerte(notifications) {
    const container = document.getElementById('lista-alerte');
    if (!container) return;

    const depletion = notifications.depletion || [];
    const periodic  = notifications.periodic  || [];

    if (depletion.length === 0 && periodic.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nu exista alerte active. Totul e in regula!</div>';
        return;
    }

    const itemsHtml = [
        ...depletion.map(item => `
            <div class="alert-item">
                <div class="alert-dot alert-dot--danger"></div>
                <div>
                    <div class="alert-name">${escapeHtml(item.name)}</div>
                    <div class="alert-desc">Stoc: ${item.quantity} / Prag: ${item.min_threshold} — ${escapeHtml(item.category_name)}</div>
                </div>
            </div>
        `),
        ...periodic.map(item => `
            <div class="alert-item">
                <div class="alert-dot alert-dot--warning"></div>
                <div>
                    <div class="alert-name">${escapeHtml(item.name)}</div>
                    <div class="alert-desc">Ultima verificare: ${item.last_checked ? new Date(item.last_checked).toLocaleDateString('ro-RO') : 'niciodata'}</div>
                </div>
            </div>
        `)
    ].join('');

    container.innerHTML = itemsHtml;
}

/* ---------- Grid categorii ---------- */
function afiseazaCategorii(categories, items) {
    const grid = document.getElementById('categorii-grid');
    if (!grid) return;

    if (categories.length === 0) {
        grid.innerHTML = '<div class="loading-row">Nu exista categorii.</div>';
        return;
    }

    /* Numaram articole per categorie */
    const countMap = {};
    (items || []).forEach(i => {
        countMap[i.category_id] = (countMap[i.category_id] || 0) + 1;
    });

    grid.innerHTML = categories.map(cat => `
        <a href="articole.html?category=${cat.id}" class="categorie-chip">
            <span class="categorie-name">${escapeHtml(cat.name)}</span>
            <span class="categorie-count">${countMap[cat.id] || 0} articole</span>
        </a>
    `).join('');
}

/* ---------- Badge numar notificari in sidebar ---------- */
function actualizeazaBadgeNav(notifications) {
    const badge = document.getElementById('nav-badge');
    if (!badge) return;

    const total = (notifications.depletion || []).length + (notifications.periodic || []).length;
    if (total > 0) {
        badge.textContent = total;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}