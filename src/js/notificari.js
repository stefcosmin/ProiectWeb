/* =============================================
   StockPro — notificari.js
   Pagina de notificari:
   - alerte stoc epuizat / redus
   - verificari restante (>30 zile)
   - actiuni rapide: actualizeaza stoc / marcheaza verificat
   ============================================= */

/* ---------- State local ---------- */
let toateArticolele  = [];
let toateCategoriile = [];
let idActiuneRapida  = null; /* id articol pentru modal actiune */

/* ---------- Initializare ---------- */
document.addEventListener('DOMContentLoaded', () => {
    incarcaDate();

    document.getElementById('btn-refresh').addEventListener('click', () => {
        incarcaDate();
        showToast('Date actualizate', 'success');
    });

    initModalCantitate();
    initModalVerificare();
});

/* ---------- Incarcare date ---------- */
async function incarcaDate() {
    try {
        const [notificari, articole, categorii] = await Promise.all([
            apiFetch('?request=notifications'),
            apiFetch('?request=items'),
            apiFetch('?request=categories')
        ]);

        toateArticolele  = articole  || [];
        toateCategoriile = categorii || [];

        const depletion = notificari.depletion || [];
        const periodic  = notificari.periodic  || [];

        afiseazaStats(depletion, periodic);
        randeazaStoc(depletion);
        randeazaVerificari(periodic);
        actualizeazaBadgeNav(depletion, periodic);

    } catch (err) {
        showToast('Eroare la încărcarea notificărilor: ' + err.message, 'error');
        console.error('[Notificari] Eroare:', err);
    }
}

/* ---------- Statistici ---------- */
function afiseazaStats(depletion, periodic) {
    const epuizate = depletion.filter(a => a.quantity <= 0);
    const reduse   = depletion.filter(a => a.quantity > 0);

    document.getElementById('val-epuizat').textContent   = epuizate.length;
    document.getElementById('val-redus').textContent     = reduse.length;
    document.getElementById('val-verificari').textContent = periodic.length;
    document.getElementById('val-total').textContent     = depletion.length + periodic.length;
}

/* ---------- Tabel alerte stoc ---------- */
function randeazaStoc(depletion) {
    const tbody = document.getElementById('tbody-stoc');
    const label = document.getElementById('label-stoc');

    if (label) {
        label.textContent = depletion.length + ' alert' + (depletion.length === 1 ? 'ă' : 'e');
    }

    /* Construim map categorii */
    const catMap = {};
    toateCategoriile.forEach(c => { catMap[c.id] = c.name; });

    if (!tbody) return;

    if (depletion.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <p>Nu există alerte de stoc. Toate articolele sunt la nivel optim!</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = depletion.map(art => {
        const stare   = getStareBadge(art.quantity, art.min_threshold);
        const catName = escapeHtml(catMap[art.category_id] || '—');

        return `
            <tr>
                <td><strong style="color:var(--gray-800)">${escapeHtml(art.name)}</strong></td>
                <td>
                    <span style="background:var(--blue-50);color:var(--blue-600);padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500">
                        ${catName}
                    </span>
                </td>
                <td style="font-family:var(--font-mono);font-size:13px">${art.quantity}</td>
                <td style="font-family:var(--font-mono);font-size:13px;color:var(--gray-500)">${art.min_threshold}</td>
                <td><span class="${stare.cls}">${stare.label}</span></td>
                <td>
                    <button
                        class="btn-table btn-edit"
                        onclick="deschideActualizareStoc(${art.id}, '${escapeHtml(art.name)}', ${art.quantity})"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Reaprovizionează
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/* ---------- Tabel verificari restante ---------- */
function randeazaVerificari(periodic) {
    const tbody = document.getElementById('tbody-verificari');
    const label = document.getElementById('label-verificari');

    if (label) {
        label.textContent = periodic.length + ' element' + (periodic.length === 1 ? '' : 'e');
    }

    const catMap = {};
    toateCategoriile.forEach(c => { catMap[c.id] = c.name; });

    if (!tbody) return;

    if (periodic.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <p>Nu există verificări restante. Totul e la zi!</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const azi = new Date();

    tbody.innerHTML = periodic.map(art => {
        const catName = escapeHtml(catMap[art.category_id] || '—');

        /* Calculam zilele de la ultima verificare */
        let zileText = '—';
        let zileCls  = 'zile-badge--warning';

        if (art.last_checked) {
            const dataVerif = new Date(art.last_checked);
            const diff      = Math.floor((azi - dataVerif) / (1000 * 60 * 60 * 24));
            zileText = diff + ' zile';
            zileCls  = diff > 60 ? 'zile-badge--danger' : 'zile-badge--warning';
        } else {
            zileText = 'Niciodată';
            zileCls  = 'zile-badge--danger';
        }

        const dataAfisata = art.last_checked
            ? new Date(art.last_checked).toLocaleDateString('ro-RO')
            : '<span style="color:var(--gray-400)">—</span>';

        return `
            <tr>
                <td><strong style="color:var(--gray-800)">${escapeHtml(art.name)}</strong></td>
                <td>
                    <span style="background:var(--blue-50);color:var(--blue-600);padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500">
                        ${catName}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--gray-600)">${dataAfisata}</td>
                <td><span class="zile-badge ${zileCls}">${zileText}</span></td>
                <td>
                    <button
                        class="btn-table btn-edit"
                        onclick="deschideMarcarVerificat(${art.id}, '${escapeHtml(art.name)}')"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Marchează verificat
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/* ---------- Modal actualizare stoc ---------- */
function initModalCantitate() {
    const modal    = document.getElementById('modal-cantitate');
    const btnClose = document.getElementById('cantitate-close');
    const btnAnul  = document.getElementById('cantitate-anuleaza');
    const btnSalv  = document.getElementById('cantitate-salveaza');

    const inchide = () => {
        modal.style.display = 'none';
        idActiuneRapida = null;
    };

    btnClose.addEventListener('click', inchide);
    btnAnul.addEventListener('click', inchide);
    modal.addEventListener('click', (e) => { if (e.target === modal) inchide(); });
    btnSalv.addEventListener('click', salveazaCantitate);
}

function deschideActualizareStoc(id, nume, cantitateActuala) {
    idActiuneRapida = id;
    document.getElementById('cantitate-nume').textContent     = nume;
    document.getElementById('input-cantitate-noua').value     = cantitateActuala;
    document.getElementById('error-cantitate-noua').textContent = '';
    document.getElementById('modal-cantitate').style.display  = 'flex';
    setTimeout(() => document.getElementById('input-cantitate-noua').focus(), 50);
}

async function salveazaCantitate() {
    const valoare = document.getElementById('input-cantitate-noua').value;
    const eroare  = document.getElementById('error-cantitate-noua');

    if (valoare === '' || isNaN(valoare) || Number(valoare) < 0) {
        eroare.textContent = 'Introdu o cantitate validă (număr pozitiv).';
        return;
    }

    eroare.textContent = '';

    /* Gasim articolul complet pentru a trimite toate campurile la PUT */
    const art = toateArticolele.find(a => a.id === idActiuneRapida);
    if (!art) return;

    const btnSalv = document.getElementById('cantitate-salveaza');
    btnSalv.disabled = true;
    btnSalv.textContent = 'Se salvează...';

    try {
        await apiFetch('?request=items/' + idActiuneRapida, 'PUT', {
            name:          art.name,
            category_id:   art.category_id,
            quantity:      Number(valoare),
            min_threshold: art.min_threshold,
            last_checked:  art.last_checked || null
        });

        showToast('Stoc actualizat cu succes!', 'success');
        document.getElementById('modal-cantitate').style.display = 'none';
        idActiuneRapida = null;
        await incarcaDate();

    } catch (err) {
        showToast('Eroare: ' + err.message, 'error');
    } finally {
        btnSalv.disabled = false;
        btnSalv.textContent = 'Salvează';
    }
}

/* ---------- Modal marcare verificat ---------- */
function initModalVerificare() {
    const modal    = document.getElementById('modal-verificare');
    const btnClose = document.getElementById('verificare-close');
    const btnAnul  = document.getElementById('verificare-anuleaza');
    const btnSalv  = document.getElementById('verificare-salveaza');

    const inchide = () => {
        modal.style.display = 'none';
        idActiuneRapida = null;
    };

    btnClose.addEventListener('click', inchide);
    btnAnul.addEventListener('click', inchide);
    modal.addEventListener('click', (e) => { if (e.target === modal) inchide(); });
    btnSalv.addEventListener('click', salveazaVerificare);
}

function deschideMarcarVerificat(id, nume) {
    idActiuneRapida = id;
    document.getElementById('verificare-nume').textContent = nume;

    /* Data de azi ca default */
    const azi = new Date().toISOString().split('T')[0];
    document.getElementById('input-data-verificare').value = azi;
    document.getElementById('modal-verificare').style.display = 'flex';
}

async function salveazaVerificare() {
    const data = document.getElementById('input-data-verificare').value;
    if (!data) {
        showToast('Selectează data verificării.', 'warning');
        return;
    }

    const art = toateArticolele.find(a => a.id === idActiuneRapida);
    if (!art) return;

    const btnSalv = document.getElementById('verificare-salveaza');
    btnSalv.disabled = true;
    btnSalv.textContent = 'Se salvează...';

    try {
        await apiFetch('?request=items/' + idActiuneRapida, 'PUT', {
            name:          art.name,
            category_id:   art.category_id,
            quantity:      art.quantity,
            min_threshold: art.min_threshold,
            last_checked:  data
        });

        showToast('Verificare înregistrată!', 'success');
        document.getElementById('modal-verificare').style.display = 'none';
        idActiuneRapida = null;
        await incarcaDate();

    } catch (err) {
        showToast('Eroare: ' + err.message, 'error');
    } finally {
        btnSalv.disabled = false;
        btnSalv.textContent = 'Confirmă verificarea';
    }
}

/* ---------- Badge nav ---------- */
function actualizeazaBadgeNav(depletion, periodic) {
    const badge = document.getElementById('nav-badge');
    if (!badge) return;
    const total = depletion.length + periodic.length;
    if (total > 0) {
        badge.textContent = total;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}