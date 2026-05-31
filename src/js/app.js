// app.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';

    // State
    let items = [];
    let categories = [];
    let notifications = { depletion: [], periodic: [] };

    // DOM Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('current-page-title');
    
    // Notification elements
    const notifBell = document.getElementById('notification-bell');
    const notifDropdown = document.getElementById('notification-dropdown');
    const notifBadge = document.getElementById('notification-badge');
    const notifList = document.getElementById('notif-list');
    const triggerEmailBtn = document.getElementById('trigger-email-btn');

    // Navigation Logic
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active states
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch view
            const target = btn.getAttribute('data-target');
            views.forEach(v => v.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');

            // Update title
            pageTitle.textContent = btn.textContent.trim().replace(/[^a-zA-Z\s]/g, '');

            if (target === 'dashboard-view') refreshDashboard();
        });
    });

    // Toggle Notifications dropdown
    notifBell.addEventListener('click', (e) => {
        notifDropdown.classList.toggle('hidden');
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        if (!notifDropdown.classList.contains('hidden') && !notifBell.contains(e.target)) {
            notifDropdown.classList.add('hidden');
        }
    });

    // API Calls
    async function fetchAPI(endpoint, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, options);
            if (!res.ok) throw new Error('API Error');
            // If it's a delete or update, it might return JSON message, we'll try to parse
            const data = await res.json().catch(() => ({}));
            return data;
        } catch (error) {
            showToast('Eroare conexiune server', 'error');
            console.error(error);
            return null;
        }
    }

    // Initialize App
    async function init() {
        await loadCategories();
        await loadItems();
        await loadNotifications();
        refreshDashboard();
        renderItemsTable();
        renderCategoriesTable();
        populateCategorySelect();
    }

    async function loadCategories() {
        const data = await fetchAPI('/categories');
        if (data) categories = data;
    }

    async function loadItems() {
        const data = await fetchAPI('/items');
        if (data) items = data;
    }

    async function loadNotifications() {
        const data = await fetchAPI('/notifications');
        if (data) {
            notifications = data;
            updateNotificationUI();
        }
    }

    // Update UI based on data
    function refreshDashboard() {
        document.getElementById('stat-total-items').textContent = items.length;
        
        const criticalItems = items.filter(i => parseInt(i.quantity) <= parseInt(i.min_threshold));
        document.getElementById('stat-critical-items').textContent = criticalItems.length;

        // Render dashboard widgets
        const depletionList = document.getElementById('imminent-depletion-list');
        depletionList.innerHTML = notifications.depletion.length ? 
            notifications.depletion.map(n => `
                <li>
                    <span><strong style="color:var(--alert)">${n.name}</strong> (${n.category_name})</span>
                    <span>Stoc: ${n.quantity} / Min: ${n.min_threshold}</span>
                </li>
            `).join('') : '<li>Nu există alerte de stoc.</li>';

        const periodicList = document.getElementById('periodic-check-list');
        periodicList.innerHTML = notifications.periodic.length ? 
            notifications.periodic.map(n => `
                <li>
                    <span><strong>${n.name}</strong></span>
                    <span style="color:var(--accent-primary)">Ultima ref: ${n.last_checked}</span>
                </li>
            `).join('') : '<li>Nicio verificare restantă.</li>';
    }

    function updateNotificationUI() {
        const total = notifications.depletion.length + notifications.periodic.length;
        notifBadge.textContent = total;
        notifBadge.style.display = total > 0 ? 'block' : 'none';

        if (total === 0) {
            notifList.innerHTML = '<div class="notif-item">Totul este la zi.</div>';
            return;
        }

        let html = '';
        notifications.depletion.forEach(n => {
            html += `<div class="notif-item alert">⚠️ Stoc redus: ${n.name} (${n.quantity} rămase)</div>`;
        });
        notifications.periodic.forEach(n => {
            html += `<div class="notif-item periodic">⏱️ Necesită verificare: ${n.name}</div>`;
        });
        notifList.innerHTML = html;
    }

    function renderItemsTable() {
        const tbody = document.getElementById('items-table-body');
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>#${item.id}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.category_name || '-'}</td>
                <td style="${parseInt(item.quantity) <= parseInt(item.min_threshold) ? 'color:var(--alert);font-weight:bold;' : ''}">
                    ${item.quantity}
                </td>
                <td>${item.min_threshold}</td>
                <td>${item.last_checked || 'Niciodată'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">Șterge</button>
                </td>
            </tr>
        `).join('');
    }

    function renderCategoriesTable() {
        const tbody = document.getElementById('categories-table-body');
        tbody.innerHTML = categories.map(cat => `
            <tr>
                <td>#${cat.id}</td>
                <td><strong>${cat.name}</strong></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id})">Șterge</button>
                </td>
            </tr>
        `).join('');
    }

    function populateCategorySelect() {
        const select = document.getElementById('item-category');
        select.innerHTML = '<option value="">Selectează Categoria</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // Modal Logic
    const itemModal = document.getElementById('item-modal');
    const categoryModal = document.getElementById('category-modal');

    document.getElementById('add-item-btn').addEventListener('click', () => {
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        itemModal.classList.remove('hidden');
    });

    document.getElementById('add-category-btn').addEventListener('click', () => {
        document.getElementById('category-form').reset();
        categoryModal.classList.remove('hidden');
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            itemModal.classList.add('hidden');
            if (categoryModal) categoryModal.classList.add('hidden');
        });
    });

    // Form Submissions
    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('item-name').value,
            category_id: document.getElementById('item-category').value,
            quantity: document.getElementById('item-quantity').value,
            min_threshold: document.getElementById('item-min').value,
            last_checked: new Date().toISOString().split('T')[0] // today
        };

        const res = await fetchAPI('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res) {
            showToast('Articol adăugat cu succes', 'success');
            itemModal.classList.add('hidden');
            await init(); // re-fetch data
        }
    });

    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('category-name').value
        };

        const res = await fetchAPI('/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res) {
            showToast('Categorie adăugată cu succes', 'success');
            categoryModal.classList.add('hidden');
            await init(); // re-fetch data
        }
    });

    // Trigger emails
    triggerEmailBtn.addEventListener('click', async () => {
        triggerEmailBtn.innerHTML = 'Se trimite...';
        await fetchAPI('/notifications/send', { method: 'POST' });
        setTimeout(() => {
            showToast('Alerte trimise cu succes!', 'success');
            triggerEmailBtn.innerHTML = '<span class="icon">📧</span> Trimite Alerte';
        }, 1000);
    });

    // Global Functions for inline onclick
    window.deleteItem = async (id) => {
        if(confirm('Ești sigur că vrei să ștergi acest articol?')) {
            await fetchAPI(`/items/${id}`, { method: 'DELETE' });
            showToast('Articol șters', 'success');
            init();
        }
    }

    window.deleteCategory = async (id) => {
        if(confirm('Ești sigur? Aceasta va afecta articolele asociate!')) {
            await fetchAPI(`/categories/${id}`, { method: 'DELETE' });
            showToast('Categorie ștearsă', 'success');
            init();
        }
    }

    // Toast functionality
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Start App
    init();
});