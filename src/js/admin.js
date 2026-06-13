let actiuneCurenta = null;

//Initializare
document.addEventListener('DOMContentLoaded', () => {
    incarcaSumar();
    verificaStatus();
    incarcaConfig();
    initConfig();
    initDangerZone();
    initModalConfirmare();
});

//sumar
async function incarcaSumar() {
    try {
        const [articole, categorii, notificari] = await Promise.all([
            apiFetch('?request=items'),
            apiFetch('?request=categories'),
            apiFetch('?request=notifications')
        ]);

        document.getElementById('val-articole').textContent = articole.length;
        document.getElementById('val-categorii').textContent = categorii.length;

        const totalAlerte = (notificari.depletion || []).length + (notificari.periodic || []).length;
        document.getElementById('val-alerte').textContent = totalAlerte;

        //badge nav
        const badge = document.getElementById('nav-badge');
        if (badge && totalAlerte > 0) {
            badge.textContent = totalAlerte;
            badge.style.display = 'inline-flex';
        }

    } catch (err) {
        console.error('[Admin] Eroare sumar:', err);
    }
}

//verificare status API
async function verificaStatus() {
    const elApi = document.getElementById('status-api');
    const elDb = document.getElementById('status-db');

    try {
        //apelare api
        await apiFetch('?request=categories');

        //aPI online
        if (elApi) {
            elApi.innerHTML = `
                <span class="status-online">
                    <span class="status-dot status-dot--online"></span>
                    Online
                </span>`;
        }

        //daca API merge, DB merge si el
        if (elDb) {
            elDb.innerHTML = `
                <span class="status-online">
                    <span class="status-dot status-dot--online"></span>
                    Conectat
                </span>`;
        }

    } catch (err) {
        //api offline
        if (elApi) {
            elApi.innerHTML = `
                <span class="status-offline">
                    <span class="status-dot status-dot--offline"></span>
                    Offline
                </span>`;
        }
        if (elDb) {
            elDb.innerHTML = `
                <span class="status-offline">
                    <span class="status-dot status-dot--offline"></span>
                    Neconectat
                </span>`;
        }
    }
}

//configurare notificari
const CONFIG_KEY = 'stockpro_config';

function incarcaConfig() {
    const salvat = localStorage.getItem(CONFIG_KEY);
    if (!salvat) return;

    try {
        const cfg = JSON.parse(salvat);
        if (cfg.zileVerificare) document.getElementById('input-zile-verificare').value = cfg.zileVerificare;
        if (cfg.email) document.getElementById('input-email').value = cfg.email;
        if (cfg.frecventa) document.getElementById('input-frecventa').value = cfg.frecventa;
    } catch (_) { /* ignoram */ }
}

function initConfig() {
    document.getElementById('btn-salveaza-config').addEventListener('click', () => {
        const zile = document.getElementById('input-zile-verificare').value;
        const email = document.getElementById('input-email').value.trim();
        const frecventa = document.getElementById('input-frecventa').value;

        //validare
        if (!zile || Number(zile) < 1) {
            showToast('Intervalul de verificare trebuie să fie cel puțin 1 zi.', 'error');
            return;
        }

        if (email && !email.includes('@')) {
            showToast('Adresa de email nu este validă.', 'error');
            return;
        }

        //salvare local storage
        const cfg = { zileVerificare: Number(zile), email, frecventa };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));

        showToast('Configurare salvată cu succes!', 'success');
    });
}

//zona stergere din db
function initDangerZone() {
    document.getElementById('btn-reset-stoc').addEventListener('click', () => {
        actiuneCurenta = 'reset-stoc';
        deschideConfirmare(
            'Resetează stocurile',
            'Această acțiune va seta cantitatea tuturor articolelor la 0. Articolele și categoriile vor rămâne. Acțiunea nu poate fi anulată!'
        );
    });

    document.getElementById('btn-sterge-articole').addEventListener('click', () => {
        actiuneCurenta = 'sterge-articole';
        deschideConfirmare(
            'Șterge toate articolele',
            'Această acțiune va șterge permanent toate articolele din inventar. Categoriile vor rămâne intacte. Acțiunea nu poate fi anulată!'
        );
    });

    document.getElementById('btn-reset-total').addEventListener('click', () => {
        actiuneCurenta = 'reset-total';
        deschideConfirmare(
            'Reset complet inventar',
            'Această acțiune va șterge permanent TOATE articolele și TOATE categoriile din inventar. Acțiunea este ireversibilă!'
        );
    });
}

//modal confirmare
function initModalConfirmare() {
    const modal = document.getElementById('modal-confirmare');
    const btnClose = document.getElementById('confirmare-close');
    const btnAnul = document.getElementById('confirmare-anuleaza');
    const btnOk = document.getElementById('confirmare-ok');
    const inputConf = document.getElementById('input-confirmare');

    const inchide = () => {
        modal.style.display = 'none';
        inputConf.value = '';
        btnOk.disabled = true;
        actiuneCurenta = null;
    };

    btnClose.addEventListener('click', inchide);
    btnAnul.addEventListener('click', inchide);
    modal.addEventListener('click', (e) => { if (e.target === modal) inchide(); });

    //activeaza butonul doar daca scrie CONFIRM
    inputConf.addEventListener('input', () => {
        btnOk.disabled = inputConf.value.trim() !== 'CONFIRM';
    });

    btnOk.addEventListener('click', executeazaActiune);
}

function deschideConfirmare(titlu, text) {
    document.getElementById('modal-confirmare-titlu').textContent = titlu;
    document.getElementById('modal-confirmare-text').textContent = text;
    document.getElementById('input-confirmare').value = '';
    document.getElementById('confirmare-ok').disabled = true;
    document.getElementById('modal-confirmare').style.display = 'flex';
    setTimeout(() => document.getElementById('input-confirmare').focus(), 50);
}

//executa actiunea periculoasa confirmata
async function executeazaActiune() {
    const btnOk = document.getElementById('confirmare-ok');
    btnOk.disabled = true;
    btnOk.textContent = 'Se procesează...';

    try {
        if (actiuneCurenta === 'reset-stoc') {
            await resetStocuri();

        } else if (actiuneCurenta === 'sterge-articole') {
            await stergeToateArticolele();

        } else if (actiuneCurenta === 'reset-total') {
            await resetTotal();
        }

        document.getElementById('modal-confirmare').style.display = 'none';
        actiuneCurenta = null;
        await incarcaSumar();

    } catch (err) {
        showToast('Eroare: ' + err.message, 'error');
    } finally {
        btnOk.disabled = false;
        btnOk.textContent = 'Confirmă';
    }
}

//actiuni concrete

//seteaza cantitatea tuturor articolelor la 0 via PUT individual
async function resetStocuri() {
    const articole = await apiFetch('?request=items');

    //actualizam fiecare articol cu quantity = 0
    for (const art of articole) {
        await apiFetch('?request=items/' + art.id, 'PUT', {
            name: art.name,
            category_id: art.category_id,
            quantity: 0,
            min_threshold: art.min_threshold,
            last_checked: art.last_checked || null
        });
    }

    showToast('Stocurile au fost resetate la 0!', 'success');
}

//sterge toate articolele via DELETE individual
async function stergeToateArticolele() {
    const articole = await apiFetch('?request=items');

    for (const art of articole) {
        await apiFetch('?request=items/' + art.id, 'DELETE');
    }

    showToast('Toate articolele au fost șterse!', 'success');
}

//sterge toate articolele si toate categoriile
async function resetTotal() {
    //mai intai articolele (foreign key)
    const articole = await apiFetch('?request=items');
    for (const art of articole) {
        await apiFetch('?request=items/' + art.id, 'DELETE');
    }

    //apoi categoriile
    const categorii = await apiFetch('?request=categories');
    for (const cat of categorii) {
        await apiFetch('?request=categories/' + cat.id, 'DELETE');
    }

    showToast('Inventarul a fost resetat complet!', 'success');
}