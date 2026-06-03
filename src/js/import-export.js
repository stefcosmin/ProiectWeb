/* =============================================
   StockPro — import-export.js
   Export: CSV, JSON, XML (via API sau generat client-side)
   Import: CSV, JSON cu preview si validare
   ============================================= */

/* ---------- State local ---------- */
let formatImport  = 'csv';   /* formatul selectat pentru import */
let dateImport    = [];      /* randurile parsate din fisier */
let numeFisier    = '';

/* ---------- Initializare ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initExport();
    initTabs();
    initDropzone();
    initImport();
    actualizeazaBadgeNotificari();
});

/* =============================================
   EXPORT
   ============================================= */
function initExport() {
    document.getElementById('btn-export-csv').addEventListener('click', () => exportDate('csv'));
    document.getElementById('btn-export-json').addEventListener('click', () => exportDate('json'));
    document.getElementById('btn-export-xml').addEventListener('click', () => exportDate('xml'));
}

/**
 * Exporta datele in formatul cerut.
 * CSV si JSON vin direct de la API (endpoint-uri existente).
 * XML e generat client-side din datele JSON.
 */
async function exportDate(format) {
    const btn = document.getElementById('btn-export-' + format);
    btn.disabled = true;
    btn.textContent = 'Se generează...';

    try {
        if (format === 'csv') {
            /* Endpoint CSV existent pe backend */
            const raspuns = await fetch('/api?request=export/csv');
            if (!raspuns.ok) throw new Error('Eroare server');
            const blob = await raspuns.blob();
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.csv', 'text/csv');

        } else if (format === 'json') {
            /* Endpoint JSON existent pe backend */
            const raspuns = await fetch('/api?request=export/json');
            if (!raspuns.ok) throw new Error('Eroare server');
            const blob = await raspuns.blob();
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.json', 'application/json');

        } else if (format === 'xml') {
            /* XML generat client-side din datele articolelor */
            const [articole, categorii] = await Promise.all([
                apiFetch('?request=items'),
                apiFetch('?request=categories')
            ]);

            const catMap = {};
            categorii.forEach(c => { catMap[c.id] = c.name; });

            const xml = genereazaXML(articole, catMap);
            const blob = new Blob([xml], { type: 'application/xml' });
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.xml', 'application/xml');
        }

        showToast('Export ' + format.toUpperCase() + ' descărcat!', 'success');

    } catch (err) {
        showToast('Eroare la export: ' + err.message, 'error');
        console.error('[Export] Eroare:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Descarcă';
    }
}

/**
 * Genereaza un string XML valid din lista de articole
 */
function genereazaXML(articole, catMap) {
    const linii = ['<?xml version="1.0" encoding="UTF-8"?>', '<inventar>'];

    articole.forEach(art => {
        linii.push('  <articol>');
        linii.push('    <id>' + escapeXML(String(art.id)) + '</id>');
        linii.push('    <nume>' + escapeXML(art.name) + '</nume>');
        linii.push('    <categorie>' + escapeXML(catMap[art.category_id] || '') + '</categorie>');
        linii.push('    <categorie_id>' + escapeXML(String(art.category_id)) + '</categorie_id>');
        linii.push('    <cantitate>' + escapeXML(String(art.quantity)) + '</cantitate>');
        linii.push('    <prag_minim>' + escapeXML(String(art.min_threshold)) + '</prag_minim>');
        linii.push('    <ultima_verificare>' + escapeXML(art.last_checked || '') + '</ultima_verificare>');
        linii.push('  </articol>');
    });

    linii.push('</inventar>');
    return linii.join('\n');
}

/** Escapeaza caractere speciale pentru XML */
function escapeXML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Declanseaza download-ul unui fisier in browser */
function descarcaFisier(blob, numeFisier, tip) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = numeFisier;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Data de azi formatata pentru numele fisierului (YYYYMMDD) */
function dataAzi() {
    const d = new Date();
    return d.getFullYear()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0');
}

/* =============================================
   IMPORT — Tab-uri format
   ============================================= */
function initTabs() {
    const tabs = document.querySelectorAll('.import-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            /* Activeaza tab-ul selectat */
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            formatImport = tab.dataset.format;

            /* Afiseaza instructiunile corecte */
            document.getElementById('info-csv').style.display  = formatImport === 'csv'  ? 'block' : 'none';
            document.getElementById('info-json').style.display = formatImport === 'json' ? 'block' : 'none';

            /* Actualizeaza filtrul de fisiere acceptate */
            const inputFile = document.getElementById('input-file');
            const subText   = document.getElementById('dropzone-format');
            inputFile.accept = '.' + formatImport;
            subText.textContent = 'Formate acceptate: .' + formatImport;

            /* Reseteaza preview daca era deschis */
            resetImport();
        });
    });
}

/* =============================================
   IMPORT — Dropzone
   ============================================= */
function initDropzone() {
    const dropzone = document.getElementById('dropzone');
    const inputFile = document.getElementById('input-file');

    /* Click pe dropzone deschide file picker */
    dropzone.addEventListener('click', () => inputFile.click());

    /* Drag & drop */
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const fisier = e.dataTransfer.files[0];
        if (fisier) proceseazaFisier(fisier);
    });

    /* File input change */
    inputFile.addEventListener('change', () => {
        const fisier = inputFile.files[0];
        if (fisier) proceseazaFisier(fisier);
    });
}

/** Proceseaza fisierul selectat si afiseaza preview */
function proceseazaFisier(fisier) {
    numeFisier = fisier.name;
    const reader = new FileReader();

    reader.onload = (e) => {
        const continut = e.target.result;
        try {
            if (formatImport === 'csv') {
                dateImport = parseazaCSV(continut);
            } else {
                dateImport = parseazaJSON(continut);
            }
            afiseazaPreview(dateImport, numeFisier);
        } catch (err) {
            showToast('Fișier invalid: ' + err.message, 'error');
        }
    };

    reader.readAsText(fisier, 'UTF-8');
}

/* =============================================
   IMPORT — Parsare fisiere
   ============================================= */

/** Parseaza un fisier CSV in array de obiecte */
function parseazaCSV(text) {
    const linii = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (linii.length < 2) throw new Error('Fișierul CSV trebuie să aibă cel puțin un rând de date.');

    /* Prima linie = header */
    const header = linii[0].split(',').map(h => h.trim().toLowerCase());
    const campuriNecesare = ['name', 'category_id', 'quantity', 'min_threshold'];

    campuriNecesare.forEach(c => {
        if (!header.includes(c)) {
            throw new Error('Coloana "' + c + '" lipsește din fișier.');
        }
    });

    return linii.slice(1).map((linie, idx) => {
        const valori = linie.split(',').map(v => v.trim());
        const obj    = {};
        header.forEach((col, i) => { obj[col] = valori[i] || ''; });

        /* Validare de baza */
        if (!obj.name) throw new Error('Rândul ' + (idx + 2) + ': "name" este gol.');
        if (isNaN(obj.quantity)) throw new Error('Rândul ' + (idx + 2) + ': "quantity" nu e număr.');
        if (isNaN(obj.min_threshold)) throw new Error('Rândul ' + (idx + 2) + ': "min_threshold" nu e număr.');

        return obj;
    });
}

/** Parseaza un fisier JSON in array de obiecte */
function parseazaJSON(text) {
    let date;
    try {
        date = JSON.parse(text);
    } catch (_) {
        throw new Error('JSON invalid. Verifică sintaxa fișierului.');
    }

    if (!Array.isArray(date)) throw new Error('JSON-ul trebuie să fie un array de articole.');
    if (date.length === 0)    throw new Error('Array-ul JSON este gol.');

    date.forEach((obj, idx) => {
        if (!obj.name)           throw new Error('Elementul ' + idx + ': "name" lipsește.');
        if (obj.quantity == null) throw new Error('Elementul ' + idx + ': "quantity" lipsește.');
        if (obj.category_id == null) throw new Error('Elementul ' + idx + ': "category_id" lipsește.');
    });

    return date;
}

/* =============================================
   IMPORT — Preview
   ============================================= */
function afiseazaPreview(date, numeFis) {
    const preview   = document.getElementById('import-preview');
    const dropzone  = document.getElementById('dropzone');
    const countBadge = document.getElementById('preview-count');
    const fileLabel  = document.getElementById('preview-filename');
    const importNr   = document.getElementById('import-nr');

    dropzone.style.display  = 'none';
    preview.style.display   = 'block';
    countBadge.textContent  = date.length + ' articole';
    fileLabel.textContent   = numeFis;
    importNr.textContent    = date.length;

    /* Construim tabelul de preview */
    const thead = document.getElementById('thead-preview');
    const tbody = document.getElementById('tbody-preview');

    /* Header din cheile primului obiect */
    const coloane = Object.keys(date[0]);
    thead.innerHTML = '<tr>' + coloane.map(c => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr>';

    /* Primele 10 randuri ca preview */
    const preview10 = date.slice(0, 10);
    tbody.innerHTML = preview10.map(row => {
        const celule = coloane.map(c => '<td>' + escapeHtml(String(row[c] || '—')) + '</td>').join('');
        return '<tr>' + celule + '</tr>';
    }).join('');

    if (date.length > 10) {
        tbody.innerHTML += `
            <tr>
                <td colspan="${coloane.length}" style="text-align:center;color:var(--gray-400);font-size:12px;padding:12px">
                    ... și încă ${date.length - 10} articole
                </td>
            </tr>`;
    }
}

/* =============================================
   IMPORT — Confirmare si trimitere la API
   ============================================= */
function initImport() {
    document.getElementById('btn-reset-import').addEventListener('click', resetImport);
    document.getElementById('btn-import-confirm').addEventListener('click', confirmaImport);
    document.getElementById('btn-inchide-log').addEventListener('click', () => {
        document.getElementById('card-log').style.display = 'none';
    });
}

function resetImport() {
    dateImport = [];
    numeFisier = '';
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('dropzone').style.display       = 'block';
    document.getElementById('input-file').value             = '';
    document.getElementById('card-log').style.display       = 'none';
}

/** Trimite fiecare articol la API via POST */
async function confirmaImport() {
    if (dateImport.length === 0) return;

    const btn = document.getElementById('btn-import-confirm');
    btn.disabled = true;
    btn.textContent = 'Se importă...';

    const loguri = [];
    let reusit   = 0;
    let esuat    = 0;

    for (let i = 0; i < dateImport.length; i++) {
        const art = dateImport[i];
        try {
            await apiFetch('?request=items', 'POST', {
                name:          String(art.name).trim(),
                category_id:   Number(art.category_id),
                quantity:      Number(art.quantity),
                min_threshold: Number(art.min_threshold),
                last_checked:  art.last_checked || null
            });
            loguri.push({ ok: true,  index: i + 1, mesaj: escapeHtml(art.name) + ' — importat cu succes' });
            reusit++;
        } catch (err) {
            loguri.push({ ok: false, index: i + 1, mesaj: escapeHtml(art.name) + ' — ' + err.message });
            esuat++;
        }
    }

    /* Afiseaza log-ul */
    afiseazaLog(loguri, reusit, esuat);

    btn.disabled = false;
    btn.textContent = 'Importă ' + dateImport.length + ' articole';

    if (reusit > 0) {
        showToast(reusit + ' articole importate cu succes!', 'success');
        resetImport();
    }
    if (esuat > 0) {
        showToast(esuat + ' articole nu au putut fi importate.', 'error');
    }
}

function afiseazaLog(loguri, reusit, esuat) {
    const card = document.getElementById('card-log');
    const body = document.getElementById('log-body');

    const sumar = `
        <div style="display:flex;gap:16px;margin-bottom:16px">
            <span class="badge badge--ok">✓ ${reusit} importate</span>
            ${esuat > 0 ? '<span class="badge badge--danger">✗ ' + esuat + ' erori</span>' : ''}
        </div>`;

    const itemsHtml = loguri.map(l => `
        <div class="log-item">
            <span class="log-index">#${l.index}</span>
            <span class="${l.ok ? 'log-ok' : 'log-error'}">${l.ok ? '✓' : '✗'} ${l.mesaj}</span>
        </div>
    `).join('');

    body.innerHTML = sumar + itemsHtml;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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