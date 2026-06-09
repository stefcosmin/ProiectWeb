/* =============================================
   StockPro — categorii.js
   CRUD complet pentru categorii:
   - listare + cautare
   - adaugare (modal)
   - editare (modal)
   - stergere (confirmare)
   ============================================= */

/* ---------- State local ---------- */
let toateCategoriilele = [];   /* lista completa din API */
let toateArticolele    = [];   /* pentru a numara articole per categorie */
let idEditare          = null; /* id-ul categoriei in curs de editare */
let idStergere         = null; /* id-ul categoriei de sters */

/* ---------- Initializare ---------- */
document.addEventListener('DOMContentLoaded', () => {
    incarcaDate();
    initModal();
    initSearch();
    initDeleteModal();
});

/* ---------- Incarcare date din API ---------- */
async function incarcaDate() {
    try {
        const [categorii, articole] = await Promise.all([
            apiFetch('?request=categories'),
            apiFetch('?request=items')
        ]);

        toateCategoriilele = categorii || [];
        toateArticolele    = articole  || [];

        afiseazaStats();
        randeazaTabel(toateCategoriilele);
        actualizeazaBadgeNotificari();

    } catch (err) {
        showToast('Eroare la încărcarea categoriilor: ' + err.message, 'error');
        console.error('[Categorii] Eroare:', err);
    }
}

/* ---------- Statistici sus ---------- */
function afiseazaStats() {
    /* Total categorii */
    const elTotal = document.getElementById('val-total');
    if (elTotal) elTotal.textContent = toateCategoriilele.length;

    /* Total articole */
    const elArticole = document.getElementById('val-articole');
    if (elArticole) elArticole.textContent = toateArticolele.length;

    /* Categoria cu cele mai multe articole */
    const elTop = document.getElementById('val-top');
    if (elTop) {
        if (toateCategoriilele.length === 0) {
            elTop.textContent = '—';
        } else {
            /* Construim map categorie_id -> count */
            const countMap = {};
            toateArticolele.forEach(a => {
                countMap[a.category_id] = (countMap[a.category_id] || 0) + 1;
            });
            /* Gasim categoria cu max articole */
            let maxCat = null;
            let maxCount = 0;
            toateCategoriilele.forEach(c => {
                const cnt = countMap[c.id] || 0;
                if (cnt > maxCount) { maxCount = cnt; maxCat = c; }
            });
            elTop.textContent = maxCat ? maxCat.name : '—';
        }
    }
}

/* ---------- Randare tabel ---------- */
function randeazaTabel(categorii) {
    const tbody     = document.getElementById('tbody-categorii');
    const labelCount = document.getElementById('label-count');

    if (labelCount) {
        labelCount.textContent = categorii.length + ' categori' + (categorii.length === 1 ? 'e' : 'i');
    }

    if (!tbody) return;

    if (categorii.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <p>Nu există categorii. Adaugă prima categorie!</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    /* Construim map categorie_id -> count articole */
    const countMap = {};
    toateArticolele.forEach(a => {
        countMap[a.category_id] = (countMap[a.category_id] || 0) + 1;
    });

    tbody.innerHTML = categorii.map((cat, index) => {
        const nrArticole = countMap[cat.id] || 0;
        return `
            <tr>
                <td style="color: var(--gray-400); font-family: var(--font-mono); font-size: 12px">
                    ${index + 1}
                </td>
                <td>
                    <strong style="color: var(--gray-800)">${escapeHtml(cat.name)}</strong>
                </td>
                <td>
                    <span style="font-family: var(--font-mono); font-size: 13px">${nrArticole}</span>
                    <span style="color: var(--gray-400); font-size: 12px"> articole</span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button
                            class="btn-table btn-edit"
                            onclick="deschideEditeaza(${cat.id}, '${escapeHtml(cat.name)}')"
                            title="Editează"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editează
                        </button>
                        <button
                            class="btn-table btn-delete"
                            onclick="deschideStergere(${cat.id}, '${escapeHtml(cat.name)}')"
                            title="Șterge"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                            </svg>
                            Șterge
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/* ---------- Cautare ---------- */
function initSearch() {
    const input = document.getElementById('input-search');
    if (!input) return;

    input.addEventListener('input', () => {
        const termen = input.value.trim().toLowerCase();
        if (!termen) {
            randeazaTabel(toateCategoriilele);
            return;
        }
        const filtrate = toateCategoriilele.filter(c =>
            c.name.toLowerCase().includes(termen)
        );
        randeazaTabel(filtrate);
    });
}

/* ---------- Modal Adauga / Editeaza ---------- */
function initModal() {
    const overlay   = document.getElementById('modal-overlay');
    const btnAdauga = document.getElementById('btn-adauga');
    const btnClose  = document.getElementById('modal-close');
    const btnAnul   = document.getElementById('btn-anuleaza');
    const btnSalv   = document.getElementById('btn-salveaza');

    /* Deschide modal pentru adaugare */
    btnAdauga.addEventListener('click', () => {
        idEditare = null;
        document.getElementById('modal-title').textContent = 'Categorie nouă';
        document.getElementById('input-nume').value = '';
        document.getElementById('error-nume').textContent = '';
        btnSalv.textContent = 'Adaugă';
        overlay.style.display = 'flex';
        setTimeout(() => document.getElementById('input-nume').focus(), 50);
    });

    /* Inchide modal */
    const inchideModal = () => {
        overlay.style.display = 'none';
        idEditare = null;
    };

    btnClose.addEventListener('click', inchideModal);
    btnAnul.addEventListener('click', inchideModal);

    /* Inchide la click pe overlay */
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) inchideModal();
    });

    /* Enter in input = salveaza */
    document.getElementById('input-nume').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnSalv.click();
    });

    /* Salveaza */
    btnSalv.addEventListener('click', salveaza);
}

/* Deschide modal pentru editare (apelat din tabel) */
function deschideEditeaza(id, numeActual) {
    idEditare = id;
    document.getElementById('modal-title').textContent = 'Editează categorie';
    document.getElementById('input-nume').value = numeActual;
    document.getElementById('error-nume').textContent = '';
    document.getElementById('btn-salveaza').textContent = 'Salvează';
    document.getElementById('modal-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('input-nume').focus(), 50);
}

/* Salveaza (adauga sau editeaza) */
async function salveaza() {
    const input = document.getElementById('input-nume');
    const eroare = document.getElementById('error-nume');
    const nume = input.value.trim();

    /* Validare */
    if (!nume) {
        eroare.textContent = 'Numele categoriei este obligatoriu.';
        input.focus();
        return;
    }
    if (nume.length < 2) {
        eroare.textContent = 'Numele trebuie să aibă cel puțin 2 caractere.';
        input.focus();
        return;
    }

    /* Verificam sa nu existe deja aceeasi categorie */
    const duplicat = toateCategoriilele.find(c =>
        c.name.toLowerCase() === nume.toLowerCase() && c.id !== idEditare
    );
    if (duplicat) {
        eroare.textContent = 'Există deja o categorie cu acest nume.';
        input.focus();
        return;
    }

    eroare.textContent = '';

    const btnSalv = document.getElementById('btn-salveaza');
    btnSalv.disabled = true;
    btnSalv.textContent = 'Se salvează...';

    try {
        if (idEditare) {
            /* PUT - editare */
            await apiFetch('?request=categories/' + idEditare, 'PUT', { name: nume });
            showToast('Categorie actualizată cu succes!', 'success');
        } else {
            /* POST - adaugare */
            await apiFetch('?request=categories', 'POST', { name: nume });
            showToast('Categorie adăugată cu succes!', 'success');
        }

        document.getElementById('modal-overlay').style.display = 'none';
        idEditare = null;
        await incarcaDate(); /* Reincarca datele */

    } catch (err) {
        showToast('Eroare: ' + err.message, 'error');
    } finally {
        btnSalv.disabled = false;
        btnSalv.textContent = idEditare ? 'Salvează' : 'Adaugă';
    }
}

/* ---------- Modal Stergere ---------- */
function initDeleteModal() {
    const modal   = document.getElementById('modal-delete');
    const btnClose = document.getElementById('delete-close');
    const btnAnul  = document.getElementById('delete-anuleaza');
    const btnConf  = document.getElementById('delete-confirma');

    const inchide = () => {
        modal.style.display = 'none';
        idStergere = null;
    };

    btnClose.addEventListener('click', inchide);
    btnAnul.addEventListener('click', inchide);
    modal.addEventListener('click', (e) => { if (e.target === modal) inchide(); });

    btnConf.addEventListener('click', sterge);
}

/* Deschide modal de confirmare stergere (apelat din tabel) */
function deschideStergere(id, nume) {
    idStergere = id;
    document.getElementById('delete-name').textContent = '"' + nume + '"';
    document.getElementById('modal-delete').style.display = 'flex';
}

/* Sterge categoria */
async function sterge() {
    if (!idStergere) return;

    const btnConf = document.getElementById('delete-confirma');
    btnConf.disabled = true;
    btnConf.textContent = 'Se șterge...';

    try {
        await apiFetch('?request=categories/' + idStergere, 'DELETE');
        showToast('Categorie ștearsă!', 'success');
        document.getElementById('modal-delete').style.display = 'none';
        idStergere = null;
        await incarcaDate();

    } catch (err) {
        showToast('Eroare la ștergere: ' + err.message, 'error');
    } finally {
        btnConf.disabled = false;
        btnConf.textContent = 'Șterge';
    }
}

/* ---------- Badge notificari in sidebar ---------- */
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
    } catch (_) {
        /* Ignoram eroarea - badge-ul ramane ascuns */
    }
}