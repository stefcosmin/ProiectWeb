
let itemsData = [];
let categoriesData = [];
let currentEditId = null;
let currentDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    //filtre
    document.getElementById('input-search').addEventListener('input', afiseazaTabel);
    document.getElementById('filter-categorie').addEventListener('change', afiseazaTabel);
    document.getElementById('filter-stare').addEventListener('change', afiseazaTabel);

    //modals
    document.getElementById('btn-adauga').addEventListener('click', openAddModal);
    document.getElementById('modal-close').addEventListener('click', closeAddModal);
    document.getElementById('btn-anuleaza').addEventListener('click', closeAddModal);
    document.getElementById('btn-salveaza').addEventListener('click', saveItem);

    document.getElementById('delete-close').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-anuleaza').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirma').addEventListener('click', confirmDelete);

    //close on overlay click
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeAddModal();
    });
    document.getElementById('modal-delete').addEventListener('click', (e) => {
        if (e.target.id === 'modal-delete') closeDeleteModal();
    });
});

async function initApp() {
    try {
        const [itemsRes, catRes, notifRes] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=categories'),
            apiFetch('?request=notifications')
        ]);
        itemsData = itemsRes;
        categoriesData = catRes;

        populateCategoriiFilter();

        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            document.getElementById('filter-categorie').value = catParam;
        }

        populateCategoriiModal();
        afiseazaTabel();
        updateStats();

        const badge = document.getElementById('nav-badge');
        const totalNotif = (notifRes.depletion || []).length + (notifRes.periodic || []).length;
        if (badge && totalNotif > 0) {
            badge.textContent = totalNotif;
            badge.style.display = 'inline-flex';
        } else if (badge) {
            badge.style.display = 'none';
        }

    } catch (err) {
        showToast('Eroare la incarcarea datelor: ' + err.message, 'error');
    }
}

function updateStats() {
    document.getElementById('val-total').textContent = itemsData.length;
    document.getElementById('val-redus').textContent = itemsData.filter(i => i.quantity > 0 && i.quantity <= i.min_threshold).length;
    document.getElementById('val-epuizat').textContent = itemsData.filter(i => i.quantity <= 0).length;

    const activeCat = new Set(itemsData.map(i => i.category_id)).size;
    document.getElementById('val-categorii').textContent = activeCat;
}

function populateCategoriiFilter() {
    const filter = document.getElementById('filter-categorie');
    categoriesData.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        filter.appendChild(opt);
    });
}

function populateCategoriiModal() {
    const sel = document.getElementById('input-categorie');
    sel.innerHTML = '<option value="">— Selecteaza categorie —</option>';
    categoriesData.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
}

function getStareCod(quantity, min) {
    if (quantity <= 0) return 'epuizat';
    if (quantity <= min) return 'redus';
    return 'ok';
}

function afiseazaTabel() {
    const tbody = document.getElementById('tbody-articole');
    const search = document.getElementById('input-search').value.toLowerCase();
    const catId = document.getElementById('filter-categorie').value;
    const stareFiltru = document.getElementById('filter-stare').value;

    let filtered = itemsData.filter(item => {
        if (search && !item.name.toLowerCase().includes(search)) return false;
        if (catId && item.category_id != catId) return false;
        if (stareFiltru && getStareCod(item.quantity, item.min_threshold) !== stareFiltru) return false;
        return true;
    });

    document.getElementById('label-count').textContent = `Afisate: ${filtered.length}`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Nu au fost gasite articole.</td></tr>';
        return;
    }

    const catMap = {};
    categoriesData.forEach(c => catMap[c.id] = c.name);

    tbody.innerHTML = filtered.map((item, idx) => {
        const stare = getStareBadge(item.quantity, item.min_threshold);
        return `
            <tr>
                <td style="color:var(--gray-500)">${idx + 1}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(catMap[item.category_id] || 'Fara categorie')}</td>
                <td style="font-family:var(--font-mono)">${item.quantity}</td>
                <td style="font-family:var(--font-mono)">${item.min_threshold}</td>
                <td>${item.last_checked ? new Date(item.last_checked).toLocaleDateString('ro-RO') : '—'}</td>
                <td><span class="${stare.cls}">${stare.label}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;margin-right:4px" onclick="openEditModal(${item.id})">Editeaza</button>
                    <button class="btn btn-danger" style="padding:4px 8px;font-size:12px" onclick="openDeleteModal(${item.id}, '${escapeHtml(item.name)}')">Sterge</button>
                </td>
            </tr>
        `;
    }).join('');
}

//modals
function clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
}

function openAddModal() {
    currentEditId = null;
    document.getElementById('modal-title').textContent = 'Articol nou';
    document.getElementById('btn-salveaza').textContent = 'Adauga';
    document.getElementById('input-nume').value = '';
    document.getElementById('input-categorie').value = '';
    document.getElementById('input-cantitate').value = '0';
    document.getElementById('input-prag').value = '5';
    document.getElementById('input-verificare').value = '';
    clearErrors();
    document.getElementById('modal-overlay').style.display = 'flex';
}

window.openEditModal = function (id) {
    const item = itemsData.find(i => i.id == id);
    if (!item) return;

    currentEditId = id;
    document.getElementById('modal-title').textContent = 'Editeaza articol';
    document.getElementById('btn-salveaza').textContent = 'Salveaza modificari';
    document.getElementById('input-nume').value = item.name;
    document.getElementById('input-categorie').value = item.category_id;
    document.getElementById('input-cantitate').value = item.quantity;
    document.getElementById('input-prag').value = item.min_threshold;
    document.getElementById('input-verificare').value = item.last_checked || '';

    clearErrors();
    document.getElementById('modal-overlay').style.display = 'flex';
};

function closeAddModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

window.openDeleteModal = function (id, name) {
    currentDeleteId = id;
    document.getElementById('delete-name').textContent = name;
    document.getElementById('modal-delete').style.display = 'flex';
};

function closeDeleteModal() {
    document.getElementById('modal-delete').style.display = 'none';
    currentDeleteId = null;
}

//crud
async function saveItem() {
    clearErrors();
    const name = document.getElementById('input-nume').value.trim();
    const category_id = document.getElementById('input-categorie').value;
    const quantity = parseInt(document.getElementById('input-cantitate').value) || 0;
    const min_threshold = parseInt(document.getElementById('input-prag').value) || 0;
    const last_checked = document.getElementById('input-verificare').value || null;

    let hasError = false;
    if (!name) { document.getElementById('error-nume').textContent = 'Numele este obligatoriu.'; hasError = true; }
    if (!category_id) { document.getElementById('error-categorie').textContent = 'Selecteaza o categorie.'; hasError = true; }
    if (hasError) return;

    const payload = { name, category_id, quantity, min_threshold, last_checked };

    try {
        if (currentEditId) {
            await apiFetch('?request=items/' + currentEditId, 'PUT', payload);
            showToast('Articol actualizat cu succes', 'success');
        } else {
            await apiFetch('?request=items', 'POST', payload);
            showToast('Articol adaugat cu succes', 'success');
        }
        closeAddModal();

        //reincarcam datele
        const [newItems, newNotif] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=notifications')
        ]);
        itemsData = newItems;
        afiseazaTabel();
        updateStats();

        const badge = document.getElementById('nav-badge');
        const totalNotif = (newNotif.depletion || []).length + (newNotif.periodic || []).length;
        if (badge && totalNotif > 0) {
            badge.textContent = totalNotif;
            badge.style.display = 'inline-flex';
        } else if (badge) {
            badge.style.display = 'none';
        }

    } catch (err) {
        showToast('Eroare: ' + err.message, 'error');
    }
}

async function confirmDelete() {
    if (!currentDeleteId) return;
    try {
        await apiFetch('?request=items/' + currentDeleteId, 'DELETE');
        showToast('Articol sters', 'success');
        closeDeleteModal();

        const [newItems, newNotif] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=notifications')
        ]);
        itemsData = newItems;
        afiseazaTabel();
        updateStats();

        const badge = document.getElementById('nav-badge');
        const totalNotif = (newNotif.depletion || []).length + (newNotif.periodic || []).length;
        if (badge && totalNotif > 0) {
            badge.textContent = totalNotif;
            badge.style.display = 'inline-flex';
        } else if (badge) {
            badge.style.display = 'none';
        }
    } catch (err) {
        showToast('Eroare la stergere: ' + err.message, 'error');
    }
}
