/* =============================================
   StockPro — statistici.js
   Grafice construite cu SVG pur (fara librarii):
   - Bar chart: articole per categorie
   - Donut chart: distributie stare stoc
   - Top 10 articole cu stoc critic
   - Raport complet per categorie
   - Export PDF via window.print()
   ============================================= */

/* ---------- State local ---------- */
let toateArticolele  = [];
let toateCategoriile = [];

/* ---------- Initializare ---------- */
document.addEventListener('DOMContentLoaded', () => {
    incarcaDate();

    /* Buton print / PDF */
    document.getElementById('btn-print').addEventListener('click', () => {
        window.print();
    });
});

/* ---------- Incarcare date ---------- */
async function incarcaDate() {
    try {
        const [articole, categorii] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=categories')
        ]);

        toateArticolele  = articole  || [];
        toateCategoriile = categorii || [];

        afiseazaStats();
        construiesteBarChart();
        construiesteDonut();
        afiseazaTopStoc();
        afiseazaRaportCategorii();
        actualizeazaBadgeNotificari();

    } catch (err) {
        showToast('Eroare la încărcarea statisticilor: ' + err.message, 'error');
        console.error('[Statistici] Eroare:', err);
    }
}

/* ---------- Statistici carduri ---------- */
function afiseazaStats() {
    document.getElementById('val-total').textContent     = toateArticolele.length;
    document.getElementById('val-categorii').textContent = toateCategoriile.length;
    document.getElementById('val-redus').textContent     = toateArticolele.filter(
        a => a.quantity > 0 && a.quantity <= a.min_threshold
    ).length;
    document.getElementById('val-epuizat').textContent   = toateArticolele.filter(
        a => a.quantity <= 0
    ).length;
}

/* =============================================
   BAR CHART — Articole per categorie
   ============================================= */
function construiesteBarChart() {
    const container = document.getElementById('chart-categorii');
    if (!container) return;

    if (toateCategoriile.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nu există categorii de afișat.</p></div>';
        return;
    }

    /* Numaram articole per categorie */
    const countMap = {};
    toateArticolele.forEach(a => {
        countMap[a.category_id] = (countMap[a.category_id] || 0) + 1;
    });

    /* Sortam descrescator dupa numar articole */
    const date = toateCategoriile
        .map(c => ({ name: c.name, count: countMap[c.id] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); /* max 10 bare */

    const max = Math.max(...date.map(d => d.count), 1);

    /* Paleta de culori albastra */
    const culori = [
        '#2563eb','#3b82f6','#60a5fa','#93c5fd',
        '#1d4ed8','#4a86e8','#7cb3f5','#a8d0fb',
        '#1e40af','#bfdbfe'
    ];

    const bari = date.map((d, i) => {
        const procent = Math.round((d.count / max) * 100);
        const culoare = culori[i % culori.length];
        return `
            <div class="bar-row">
                <div class="bar-label" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${procent}%;background:${culoare}">
                        <span class="bar-val">${d.count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = '<div class="bar-chart">' + bari + '</div>';
}

/* =============================================
   DONUT CHART — Distributie stare stoc
   ============================================= */
function construiesteDonut() {
    const container = document.getElementById('chart-stare');
    if (!container) return;

    const ok      = toateArticolele.filter(a => a.quantity > a.min_threshold).length;
    const redus   = toateArticolele.filter(a => a.quantity > 0 && a.quantity <= a.min_threshold).length;
    const epuizat = toateArticolele.filter(a => a.quantity <= 0).length;
    const total   = toateArticolele.length;

    if (total === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nu există articole de afișat.</p></div>';
        return;
    }

    const segmente = [
        { label: 'OK',         valoare: ok,      culoare: '#22c55e' },
        { label: 'Stoc redus', valoare: redus,   culoare: '#f59e0b' },
        { label: 'Epuizat',    valoare: epuizat, culoare: '#ef4444' }
    ].filter(s => s.valoare > 0);

    /* Construim SVG donut */
    const raza       = 60;
    const razaIntern = 38;
    const cx         = 80;
    const cy         = 80;
    let unghi        = -90; /* porneste de sus */

    const pathuri = segmente.map(seg => {
        const procent  = seg.valoare / total;
        const grade    = procent * 360;
        const radStart = (unghi * Math.PI) / 180;
        const radEnd   = ((unghi + grade) * Math.PI) / 180;

        const x1 = cx + raza * Math.cos(radStart);
        const y1 = cy + raza * Math.sin(radStart);
        const x2 = cx + raza * Math.cos(radEnd);
        const y2 = cy + raza * Math.sin(radEnd);
        const xi1 = cx + razaIntern * Math.cos(radStart);
        const yi1 = cy + razaIntern * Math.sin(radStart);
        const xi2 = cx + razaIntern * Math.cos(radEnd);
        const yi2 = cy + razaIntern * Math.sin(radEnd);

        const largeArc = grade > 180 ? 1 : 0;

        const d = [
            `M ${x1} ${y1}`,
            `A ${raza} ${raza} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${xi2} ${yi2}`,
            `A ${razaIntern} ${razaIntern} 0 ${largeArc} 0 ${xi1} ${yi1}`,
            'Z'
        ].join(' ');

        unghi += grade;

        return `<path d="${d}" fill="${seg.culoare}" opacity="0.9"/>`;
    }).join('');

    /* Text central */
    const svgCentru = `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="600" fill="#111" font-family="DM Mono, monospace">${total}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#80868b" font-family="DM Sans, sans-serif">articole</text>`;

    const svg = `
        <svg class="donut-svg" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-label="Distributie stare stoc">
            ${pathuri}
            ${svgCentru}
        </svg>`;

    /* Legenda */
    const legenda = segmente.map(seg => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${seg.culoare}"></div>
            <span>${escapeHtml(seg.label)}</span>
            <span class="legend-val">${seg.valoare} (${Math.round(seg.valoare / total * 100)}%)</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="donut-wrap">
            ${svg}
            <div class="donut-legend">${legenda}</div>
        </div>`;
}

/* =============================================
   TOP 10 — Articole cu stoc critic
   ============================================= */
function afiseazaTopStoc() {
    const tbody = document.getElementById('tbody-top-stoc');
    if (!tbody) return;

    const catMap = {};
    toateCategoriile.forEach(c => { catMap[c.id] = c.name; });

    /* Sortam dupa diferenta cantitate - prag (cele mai critice primele) */
    const sortate = [...toateArticolele]
        .sort((a, b) => (a.quantity - a.min_threshold) - (b.quantity - b.min_threshold))
        .slice(0, 10);

    if (sortate.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Nu există articole.</td></tr>';
        return;
    }

    tbody.innerHTML = sortate.map((art, i) => {
        const stare    = getStareBadge(art.quantity, art.min_threshold);
        const catName  = escapeHtml(catMap[art.category_id] || '—');

        /* Bara de nivel stoc */
        const procent = art.min_threshold > 0
            ? Math.min(Math.round((art.quantity / art.min_threshold) * 100), 100)
            : 100;

        let culoareBara = '#22c55e';
        if (art.quantity <= 0)                             culoareBara = '#ef4444';
        else if (art.quantity <= art.min_threshold)        culoareBara = '#f59e0b';

        return `
            <tr>
                <td style="color:var(--gray-400);font-family:var(--font-mono);font-size:12px">${i + 1}</td>
                <td><strong style="color:var(--gray-800)">${escapeHtml(art.name)}</strong></td>
                <td>
                    <span style="background:var(--blue-50);color:var(--blue-600);padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500">
                        ${catName}
                    </span>
                </td>
                <td style="font-family:var(--font-mono)">${art.quantity}</td>
                <td style="font-family:var(--font-mono);color:var(--gray-500)">${art.min_threshold}</td>
                <td>
                    <div class="stoc-bar">
                        <div class="stoc-fill" style="width:${procent}%;background:${culoareBara}"></div>
                    </div>
                </td>
                <td><span class="${stare.cls}">${stare.label}</span></td>
            </tr>
        `;
    }).join('');
}

/* =============================================
   RAPORT COMPLET — Per categorie
   ============================================= */
function afiseazaRaportCategorii() {
    const tbody = document.getElementById('tbody-raport-categorii');
    if (!tbody) return;

    if (toateCategoriile.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Nu există categorii.</td></tr>';
        return;
    }

    tbody.innerHTML = toateCategoriile.map(cat => {
        const artCat   = toateArticolele.filter(a => a.category_id === cat.id);
        const total    = artCat.length;
        const stocTot  = artCat.reduce((s, a) => s + Number(a.quantity), 0);
        const reduse   = artCat.filter(a => a.quantity > 0 && a.quantity <= a.min_threshold).length;
        const epuizate = artCat.filter(a => a.quantity <= 0).length;

        return `
            <tr>
                <td><strong style="color:var(--gray-800)">${escapeHtml(cat.name)}</strong></td>
                <td style="font-family:var(--font-mono)">${total}</td>
                <td style="font-family:var(--font-mono)">${stocTot}</td>
                <td>
                    ${reduse > 0
                        ? `<span class="badge badge--warning">${reduse}</span>`
                        : '<span style="color:var(--gray-300)">—</span>'}
                </td>
                <td>
                    ${epuizate > 0
                        ? `<span class="badge badge--danger">${epuizate}</span>`
                        : '<span style="color:var(--gray-300)">—</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

/* ---------- Badge notificari ---------- */
async function actualizeazaBadgeNotificari() {
    try {
        const notif = await apiFetch('?request=notifications');
        const badge = document.getElementById('nav-badge');
        if (!badge) return;
        const total = (notif.depletion || []).length + (notif.periodic || []).length;
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'inline-flex';
        }
    } catch (_) { /* ignoram */ }
}