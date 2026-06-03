/* =============================================
   StockPro — import-export.js
   Export: CSV, JSON, XML
   Import: CSV, JSON, XML cu preview si validare
   Cerinta acoperita: import/export in formatele
   CSV, JSON si XML (toate 3 directii)
   ============================================= */

/* ---------- State local ---------- */
let formatImport = 'csv'; /* formatul curent selectat pentru import */
let dateImport   = [];    /* articolele parsate din fisierul incarcat */
let numeFisier   = '';    /* numele fisierului incarcat */

/* ---------- Initializare ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initExport();
    initTabs();
    initDropzone();
    initImport();
    actualizeazaBadgeNotificari();
});

/* =============================================
   EXPORT — CSV, JSON, XML
   ============================================= */
function initExport() {
    document.getElementById('btn-export-csv').addEventListener('click',  () => exportDate('csv'));
    document.getElementById('btn-export-json').addEventListener('click', () => exportDate('json'));
    document.getElementById('btn-export-xml').addEventListener('click',  () => exportDate('xml'));
}

/**
 * Exporta datele inventarului in formatul cerut.
 * CSV si JSON: apelate direct din API (endpoint-uri backend).
 * XML: generat client-side din datele primite via AJAX.
 * @param {'csv'|'json'|'xml'} format
 */
async function exportDate(format) {
    const btn = document.getElementById('btn-export-' + format);
    btn.disabled    = true;
    btn.textContent = 'Se genereaza...';

    try {
        if (format === 'csv') {
            /* Endpoint CSV existent pe backend */
            const raspuns = await fetch('/api?request=export/csv');
            if (!raspuns.ok) throw new Error('Eroare server la export CSV');
            const blob = await raspuns.blob();
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.csv', 'text/csv');

        } else if (format === 'json') {
            /* Endpoint JSON existent pe backend */
            const raspuns = await fetch('/api?request=export/json');
            if (!raspuns.ok) throw new Error('Eroare server la export JSON');
            const blob = await raspuns.blob();
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.json', 'application/json');

        } else if (format === 'xml') {
            /* XML generat client-side din datele articolelor si categoriilor */
            const [articole, categorii] = await Promise.all([
                apiFetch('?request=items'),
                apiFetch('?request=categories')
            ]);

            /* Construim map id -> name pentru categorii */
            const catMap = {};
            categorii.forEach(c => { catMap[c.id] = c.name; });

            const xml  = genereazaXML(articole, catMap);
            const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
            descarcaFisier(blob, 'inventar_' + dataAzi() + '.xml', 'application/xml');
        }

        showToast('Export ' + format.toUpperCase() + ' descarcat cu succes!', 'success');

    } catch (err) {
        showToast('Eroare la export: ' + err.message, 'error');
        console.error('[Export ' + format + '] Eroare:', err);
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Descarca';
    }
}

/**
 * Genereaza un document XML valid W3C din lista de articole.
 * Structura: radacina <inventar>, elemente <articol>.
 * @param {Array} articole
 * @param {Object} catMap - map id -> name categorii
 * @returns {string} XML ca string
 */
function genereazaXML(articole, catMap) {
    const linii = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<inventar>'
    ];

    articole.forEach(art => {
        linii.push('  <articol>');
        linii.push('    <id>'                + escapeXML(String(art.id))            + '</id>');
        linii.push('    <nume>'              + escapeXML(art.name)                  + '</nume>');
        linii.push('    <categorie>'         + escapeXML(catMap[art.category_id] || '') + '</categorie>');
        linii.push('    <categorie_id>'      + escapeXML(String(art.category_id))   + '</categorie_id>');
        linii.push('    <cantitate>'         + escapeXML(String(art.quantity))      + '</cantitate>');
        linii.push('    <prag_minim>'        + escapeXML(String(art.min_threshold)) + '</prag_minim>');
        linii.push('    <ultima_verificare>' + escapeXML(art.last_checked || '')    + '</ultima_verificare>');
        linii.push('  </articol>');
    });

    linii.push('</inventar>');
    return linii.join('\n');
}

/**
 * Escapeaza caracterele speciale XML pentru a preveni injectii.
 * @param {string} str
 * @returns {string}
 */
function escapeXML(str) {
    return String(str || '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&apos;');
}

/**
 * Declanseaza descarcarea unui fisier in browser via URL object.
 * @param {Blob} blob
 * @param {string} nume - numele fisierului descarcat
 * @param {string} tip  - MIME type
 */
function descarcaFisier(blob, nume, tip) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = nume;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Returneaza data curenta formatata YYYYMMDD pentru numele fisierului.
 * @returns {string}
 */
function dataAzi() {
    const d = new Date();
    return d.getFullYear()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0');
}

/* =============================================
   IMPORT — Tab-uri format (CSV / JSON / XML)
   ============================================= */
function initTabs() {
    const tabs = document.querySelectorAll('.import-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            /* Activeaza tab-ul selectat */
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            formatImport = tab.dataset.format;

            /* Afiseaza instructiunile pentru formatul ales */
            document.getElementById('info-csv').style.display  = formatImport === 'csv'  ? 'block' : 'none';
            document.getElementById('info-json').style.display = formatImport === 'json' ? 'block' : 'none';
            document.getElementById('info-xml').style.display  = formatImport === 'xml'  ? 'block' : 'none';

            /* Actualizeaza filtrul file input */
            const inputFile = document.getElementById('input-file');
            const subText   = document.getElementById('dropzone-format');

            inputFile.accept        = '.' + formatImport;
            subText.textContent     = 'Formate acceptate: .' + formatImport;

            /* Reseteaza preview daca era deschis */
            resetImport();
        });
    });
}

/* =============================================
   IMPORT — Dropzone (drag & drop + click)
   ============================================= */
function initDropzone() {
    const dropzone  = document.getElementById('dropzone');
    const inputFile = document.getElementById('input-file');

    /* Click pe dropzone -> deschide file picker */
    dropzone.addEventListener('click', () => inputFile.click());

    /* Drag over -> highlight */
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    /* Drop -> proceseaza fisierul */
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

/**
 * Citeste fisierul si il parseaza in functie de format.
 * Afiseaza preview dupa parsare reusita.
 * @param {File} fisier
 */
function proceseazaFisier(fisier) {
    numeFisier = fisier.name;
    const reader = new FileReader();

    reader.onload = (e) => {
        const continut = e.target.result;
        try {
            if (formatImport === 'csv') {
                dateImport = parseazaCSV(continut);
            } else if (formatImport === 'json') {
                dateImport = parseazaJSON(continut);
            } else if (formatImport === 'xml') {
                dateImport = parseazaXML(continut);
            }
            afiseazaPreview(dateImport, numeFisier);
        } catch (err) {
            showToast('Fisier invalid: ' + err.message, 'error');
            console.error('[Import] Eroare parsare:', err);
        }
    };

    reader.readAsText(fisier, 'UTF-8');
}

/* =============================================
   PARSARE FISIERE
   ============================================= */

/**
 * Parseaza continut CSV in array de obiecte.
 * Prima linie = header cu numele coloanelor.
 * Campuri obligatorii: name, category_id, quantity, min_threshold.
 * @param {string} text
 * @returns {Array<Object>}
 */
function parseazaCSV(text) {
    const linii = text.trim().split('\n').map(l => l.trim()).filter(l => l);

    if (linii.length < 2) {
        throw new Error('Fisierul CSV trebuie sa aiba cel putin un rand de date dupa header.');
    }

    /* Prima linie = header */
    const header = linii[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const campuriNecesare = ['name', 'category_id', 'quantity', 'min_threshold'];

    campuriNecesare.forEach(camp => {
        if (!header.includes(camp)) {
            throw new Error('Coloana "' + camp + '" lipseste din header-ul CSV.');
        }
    });

    return linii.slice(1).map((linie, idx) => {
        /* Parsam valorile tinand cont de ghilimele */
        const valori = linie.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj    = {};
        header.forEach((col, i) => { obj[col] = valori[i] || ''; });

        /* Validare campuri obligatorii */
        if (!obj.name || obj.name.trim() === '') {
            throw new Error('Randul ' + (idx + 2) + ': campul "name" este gol.');
        }
        if (isNaN(Number(obj.quantity))) {
            throw new Error('Randul ' + (idx + 2) + ': "quantity" trebuie sa fie un numar.');
        }
        if (isNaN(Number(obj.min_threshold))) {
            throw new Error('Randul ' + (idx + 2) + ': "min_threshold" trebuie sa fie un numar.');
        }
        if (!obj.category_id || isNaN(Number(obj.category_id))) {
            throw new Error('Randul ' + (idx + 2) + ': "category_id" trebuie sa fie un numar valid.');
        }

        return obj;
    });
}

/**
 * Parseaza continut JSON in array de obiecte.
 * Se asteapta un array la nivel de radacina.
 * @param {string} text
 * @returns {Array<Object>}
 */
function parseazaJSON(text) {
    let date;
    try {
        date = JSON.parse(text);
    } catch (_) {
        throw new Error('JSON invalid. Verifica sintaxa fisierului (ghilimele, virgule, acolade).');
    }

    if (!Array.isArray(date)) {
        throw new Error('JSON-ul trebuie sa fie un array (lista) de articole, nu un obiect.');
    }
    if (date.length === 0) {
        throw new Error('Array-ul JSON este gol. Nu exista articole de importat.');
    }

    /* Validam fiecare element */
    date.forEach((obj, idx) => {
        if (!obj.name)               throw new Error('Elementul ' + idx + ': campul "name" lipseste.');
        if (obj.quantity == null)     throw new Error('Elementul ' + idx + ': campul "quantity" lipseste.');
        if (obj.category_id == null)  throw new Error('Elementul ' + idx + ': campul "category_id" lipseste.');
        if (obj.min_threshold == null) throw new Error('Elementul ' + idx + ': campul "min_threshold" lipseste.');
    });

    return date;
}

/**
 * Parseaza continut XML in array de obiecte.
 * Foloseste DOMParser nativ al browserului.
 * Structura asteptata: <inventar><articol>...</articol></inventar>
 * Taguri suportate: <nume>, <categorie_id>, <cantitate>, <prag_minim>, <ultima_verificare>
 * @param {string} text
 * @returns {Array<Object>}
 */
function parseazaXML(text) {
    /* Parsam XML-ul cu DOMParser nativ */
    const parser = new DOMParser();
    const doc    = parser.parseFromString(text, 'application/xml');

    /* Verificam erori de parsare XML */
    const eroareParser = doc.querySelector('parsererror');
    if (eroareParser) {
        throw new Error('XML invalid: ' + eroareParser.textContent.split('\n')[0]);
    }

    /* Gasim toate elementele <articol> */
    const noduri = doc.querySelectorAll('articol');
    if (noduri.length === 0) {
        throw new Error('Nu s-au gasit elemente <articol> in fisierul XML.');
    }

    /* Convertim fiecare nod XML intr-un obiect JS */
    const rezultate = [];
    noduri.forEach((nod, idx) => {
        /* Citim textul din fiecare tag, cu fallback la string gol */
        const getText = (tag) => (nod.querySelector(tag) || {}).textContent || '';

        const name         = getText('nume').trim();
        const category_id  = getText('categorie_id').trim();
        const quantity     = getText('cantitate').trim();
        const min_threshold = getText('prag_minim').trim();
        const last_checked = getText('ultima_verificare').trim();

        /* Validare campuri obligatorii */
        if (!name) {
            throw new Error('Articolul ' + (idx + 1) + ': tag-ul <nume> este gol sau lipseste.');
        }
        if (!category_id || isNaN(Number(category_id))) {
            throw new Error('Articolul ' + (idx + 1) + ': <categorie_id> trebuie sa fie un numar valid.');
        }
        if (quantity === '' || isNaN(Number(quantity))) {
            throw new Error('Articolul ' + (idx + 1) + ': <cantitate> trebuie sa fie un numar.');
        }
        if (min_threshold === '' || isNaN(Number(min_threshold))) {
            throw new Error('Articolul ' + (idx + 1) + ': <prag_minim> trebuie sa fie un numar.');
        }

        rezultate.push({
            name,
            category_id:   category_id,
            quantity:      quantity,
            min_threshold: min_threshold,
            last_checked:  last_checked || null
        });
    });

    return rezultate;
}

/* =============================================
   PREVIEW TABEL
   ============================================= */

/**
 * Afiseaza primele 10 randuri din fisierul parsat
 * intr-un tabel de preview inainte de import.
 * @param {Array<Object>} date
 * @param {string} numeFis
 */
function afiseazaPreview(date, numeFis) {
    const preview    = document.getElementById('import-preview');
    const dropzone   = document.getElementById('dropzone');
    const countBadge = document.getElementById('preview-count');
    const fileLabel  = document.getElementById('preview-filename');
    const importNr   = document.getElementById('import-nr');

    /* Ascundem dropzone, afisam preview */
    dropzone.style.display = 'none';
    preview.style.display  = 'block';

    countBadge.textContent = date.length + ' articole';
    fileLabel.textContent  = numeFis;
    importNr.textContent   = date.length;

    /* Construim tabelul de preview din cheile primului obiect */
    const thead  = document.getElementById('thead-preview');
    const tbody  = document.getElementById('tbody-preview');
    const coloane = Object.keys(date[0]);

    thead.innerHTML = '<tr>' + coloane.map(c => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr>';

    /* Afisam maxim 10 randuri */
    const primele10 = date.slice(0, 10);
    tbody.innerHTML = primele10.map(row => {
        const celule = coloane.map(c => '<td>' + escapeHtml(String(row[c] != null ? row[c] : '—')) + '</td>').join('');
        return '<tr>' + celule + '</tr>';
    }).join('');

    /* Mesaj daca sunt mai multe */
    if (date.length > 10) {
        tbody.innerHTML += `
            <tr>
                <td colspan="${coloane.length}" style="text-align:center;color:var(--gray-400);font-size:12px;padding:12px">
                    ... si inca ${date.length - 10} articole
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

/** Reseteaza starea importului la starea initiala */
function resetImport() {
    dateImport = [];
    numeFisier = '';
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('dropzone').style.display       = 'block';
    document.getElementById('input-file').value             = '';
    document.getElementById('card-log').style.display       = 'none';
}

/**
 * Trimite fiecare articol parsat la API via POST asincron.
 * Afiseaza un log detaliat cu rezultatele importului.
 */
async function confirmaImport() {
    if (dateImport.length === 0) return;

    const btn = document.getElementById('btn-import-confirm');
    btn.disabled    = true;
    btn.textContent = 'Se importa...';

    const loguri = [];
    let reusit   = 0;
    let esuat    = 0;

    /* Trimitem fiecare articol individual la API */
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
            loguri.push({ ok: true,  index: i + 1, mesaj: escapeHtml(String(art.name)) + ' — importat cu succes' });
            reusit++;
        } catch (err) {
            loguri.push({ ok: false, index: i + 1, mesaj: escapeHtml(String(art.name)) + ' — ' + err.message });
            esuat++;
        }
    }

    /* Afisam log-ul rezultatelor */
    afiseazaLog(loguri, reusit, esuat);

    btn.disabled    = false;
    btn.textContent = 'Importa ' + dateImport.length + ' articole';

    if (reusit > 0) {
        showToast(reusit + ' articole importate cu succes!', 'success');
        resetImport();
    }
    if (esuat > 0) {
        showToast(esuat + ' articole nu au putut fi importate.', 'error');
    }
}

/**
 * Afiseaza log-ul detaliat al importului (succese + erori).
 * @param {Array} loguri
 * @param {number} reusit
 * @param {number} esuat
 */
function afiseazaLog(loguri, reusit, esuat) {
    const card = document.getElementById('card-log');
    const body = document.getElementById('log-body');

    const sumar = `
        <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
            <span class="badge badge--ok">&#10003; ${reusit} importate</span>
            ${esuat > 0 ? '<span class="badge badge--danger">&#10007; ' + esuat + ' erori</span>' : ''}
        </div>`;

    const itemsHtml = loguri.map(l => `
        <div class="log-item">
            <span class="log-index">#${l.index}</span>
            <span class="${l.ok ? 'log-ok' : 'log-error'}">${l.ok ? '&#10003;' : '&#10007;'} ${l.mesaj}</span>
        </div>
    `).join('');

    body.innerHTML = sumar + itemsHtml;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Badge notificari in sidebar ---------- */
async function actualizeazaBadgeNotificari() {
    try {
        const notif = await apiFetch('?request=notifications');
        const badge = document.getElementById('nav-badge');
        if (!badge) return;
        const total = (notif.depletion || []).length + (notif.periodic || []).length;
        if (total > 0) {
            badge.textContent   = total;
            badge.style.display = 'inline-flex';
        }
    } catch (_) { /* ignoram eroarea — badge-ul ramane ascuns */ }
}