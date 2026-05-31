document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
});

// Invocarea serviciului Web în manieră asincronă (Ajax) 
function fetchInventory() {
    fetch('api/items.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                renderInventory(data.data);
                checkNotifications(data.data);
            }
        })
        .catch(error => console.error('Eroare la preluarea datelor:', error));
}

function renderInventory(items) {
    const container = document.getElementById('inventory-list');
    container.innerHTML = ''; // Curățăm starea de încărcare

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        // Prevenirea Cross Site Scripting (XSS) prin folosirea textContent 
        const title = document.createElement('h3');
        title.textContent = item.name;

        const category = document.createElement('p');
        category.textContent = `Categorie: ${item.category_name}`;

        const quantity = document.createElement('p');
        quantity.textContent = `Cantitate: ${item.quantity}`;

        if (parseInt(item.quantity) <= parseInt(item.min_threshold)) {
            quantity.classList.add('warning');
        }

        card.appendChild(title);
        card.appendChild(category);
        card.appendChild(quantity);
        container.appendChild(card);
    });
}

// Notificare în interfața aplicației  privind epuizarea iminentă 
function checkNotifications(items) {
    const notificationsPanel = document.getElementById('notifications-panel');
    notificationsPanel.innerHTML = '';

    items.forEach(item => {
        if (parseInt(item.quantity) <= parseInt(item.min_threshold)) {
            const alertMsg = document.createElement('p');
            alertMsg.className = 'warning';
            alertMsg.textContent = `Atenție: Stocul pentru "${item.name}" este scăzut (${item.quantity} rămase)!`;
            notificationsPanel.appendChild(alertMsg);
        }
    });
}