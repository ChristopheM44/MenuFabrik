document.addEventListener('DOMContentLoaded', () => {

    // UI Elements
    const statusContainer = document.getElementById('status-container');
    const btnStart = document.getElementById('btn-start');
    const btnClear = document.getElementById('btn-clear');
    const chkAll = document.getElementById('chk-all');
    const shoppingListEl = document.getElementById('shopping-list');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    let currentItems = [];
    let isProcessing = false;

    // init state
    checkCurrentState();

    function checkCurrentState() {
        chrome.storage.local.get([MF_KEYS.ITEMS, MF_KEYS.PROCESSING], (res) => {
            isProcessing = res[MF_KEYS.PROCESSING] || false;

            if (res[MF_KEYS.ITEMS] && res[MF_KEYS.ITEMS].length > 0) {
                currentItems = res[MF_KEYS.ITEMS];
                renderList();
                statusContainer.innerText = `${currentItems.length} articles prêts à l'import !`;

                checkLeclercTab();
            } else {
                statusContainer.innerText = "Aucune liste de courses en attente. Générez-la depuis MenuFabrik.";
            }

            if (isProcessing) {
                progressContainer.classList.remove('hidden');
            }
            updateStartButton();
        });
    }

    // Écouter les changements de Chrome Storage en temps réel
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes[MF_KEYS.ITEMS]) {
                currentItems = changes[MF_KEYS.ITEMS].newValue || [];
                renderList();
            }
            if (changes[MF_KEYS.PROCESSING]) {
                isProcessing = changes[MF_KEYS.PROCESSING].newValue;
                updateStartButton();
                if (!isProcessing) {
                    checkLeclercTab();
                    // Don't overwrite status if there's a 'doing' item (means we're paused)
                    const hasDoing = currentItems.some(i => i._status === 'doing');
                    if (!hasDoing) {
                        statusContainer.innerText = "Terminé !";
                    } else {
                        statusContainer.innerText = "Copilote en pause. Cliquez sur Reprendre.";
                    }
                } else {
                    progressContainer.classList.remove('hidden');
                }
            }
        }
    });

    function updateStartButton() {
        if (isProcessing) {
            btnStart.classList.add('disabled');
            btnStart.disabled = true;
            btnStart.classList.remove('btn-pause');
            btnStart.innerText = "🖥️ Copilote en cours...";
        } else {
            // Check if there's a paused 'doing' item to show a resume button
            const hasDoing = currentItems.some(i => i._status === 'doing');
            if (hasDoing) {
                btnStart.classList.remove('disabled');
                btnStart.disabled = false;
                btnStart.innerText = "▶️ Reprendre";
            } else {
                btnStart.innerText = "🛒 Lancer l'import";
            }
        }
    }

    function checkLeclercTab() {
        if (isProcessing) return;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab && currentTab.url && currentTab.url.includes("leclercdrive.fr")) {
                btnStart.classList.remove('disabled');
                btnStart.disabled = false;
                // Add event listener safely
                btnStart.removeEventListener('click', startImportProcess);
                btnStart.addEventListener('click', startImportProcess);
            } else {
                statusContainer.innerHTML = "<b>Action requise :</b> Ouvrez <i>leclercdrive.fr</i> pour lancer l'import.";
                btnStart.classList.add('disabled');
                btnStart.disabled = true;
            }
        });
    }

    function renderList() {
        shoppingListEl.innerHTML = '';
        currentItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'item';

            // Ensure selected state exists initially
            if (item._selected === undefined) {
                // Check by default if not ok or doing
                item._selected = (item._status !== 'ok' && item._status !== 'doing');
            }

            // Affichage de la quantité si > 1
            const quantityBadge = (item.quantity && item.quantity > 1)
                ? `<span class="item-qty">×${item.quantity}</span>`
                : '';

            let statusHtml = '<span class="item-status">Attente</span>';
            if (item._status === 'ok') statusHtml = '<span class="item-status ok">Ajouté</span>';
            else if (item._status === 'skipped') statusHtml = '<span class="item-status skipped" title="Cliquez pour réessayer">Passé ↻</span>';
            else if (item._status === 'err') statusHtml = '<span class="item-status err" title="Cliquez pour réessayer">Erreur ↻</span>';
            else if (item._status === 'doing') statusHtml = '<span class="item-status doing">Action requise</span>';

            const isStrikethrough = item._status === 'ok' || item._status === 'skipped';
            const isDisabled = item._status === 'doing' || isProcessing;

            li.innerHTML = `
                <label class="item-label">
                    <input type="checkbox" class="item-checkbox" data-index="${index}" ${item._selected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                    <span class="item-name ${isStrikethrough ? 'item-name--done' : ''}">${item.name}</span>
                    ${quantityBadge}
                </label>
                ${statusHtml}
            `;

            shoppingListEl.appendChild(li);
        });

        // Add event listeners to checkboxes
        document.querySelectorAll('.item-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                currentItems[idx]._selected = e.target.checked;
                saveState();
                updateChkAllState();
            });
        });

        // Add event listeners to error/skipped badges for quick retry
        document.querySelectorAll('.item-status.err, .item-status.skipped').forEach((badge) => {
            const trueIndex = Array.from(document.querySelectorAll('.item')).indexOf(badge.closest('.item'));
            badge.addEventListener('click', () => {
                if (!isProcessing && currentItems[trueIndex]) {
                    currentItems[trueIndex]._status = null;
                    currentItems[trueIndex]._selected = true;
                    saveState();
                    renderList();
                }
            });
        });

        updateChkAllState();

        // Mettre à jour la barre de progression
        const completed = currentItems.filter(i => i._status === 'ok' || i._status === 'err' || i._status === 'skipped').length;
        const trueTotal = currentItems.length;

        if (trueTotal > 0) {
            progressFill.style.width = `${(completed / trueTotal) * 100}%`;
            progressText.innerText = `${completed}/${trueTotal} articles traités`;
        }
    }

    function updateChkAllState() {
        const allChecked = currentItems.length > 0 && currentItems.every(i => i._selected);
        const someChecked = currentItems.some(i => i._selected);
        chkAll.checked = allChecked;
        chkAll.indeterminate = someChecked && !allChecked;
        chkAll.disabled = isProcessing;
    }

    function saveState() {
        chrome.storage.local.set({ [MF_KEYS.ITEMS]: currentItems });
    }

    chkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        currentItems.forEach(item => {
            if (item._status !== 'doing') {
                item._selected = isChecked;
            }
        });
        saveState();
        renderList();
    });

    btnClear.addEventListener('click', () => {
        if (!isProcessing && confirm("Voulez-vous vraiment vider la liste ?")) {
            currentItems = [];
            saveState();
            checkCurrentState();
        }
    });

    async function startImportProcess() {
        if (isProcessing) return;

        // CAS 1 : Reprise après une pause. Il y a un article 'doing' dans la liste.
        // On n'a rien à changer dans les items, on réactive juste le processing.
        const hasDoing = currentItems.some(i => i._status === 'doing');

        if (hasDoing) {
            console.log('Reprise du Copilote depuis l\'article en pause.');
            chrome.storage.local.set({ [MF_KEYS.PROCESSING]: true });
            window.close(); // Fermer le popup, le Copilote continue en arrière-plan
            return;
        }

        // CAS 2 : Démarrage normal. On cherche le premier article à traiter.
        let foundOne = false;
        for (let i = 0; i < currentItems.length; i++) {
            if (currentItems[i]._selected && currentItems[i]._status !== 'ok' && currentItems[i]._status !== 'skipped') {
                currentItems[i]._status = 'doing'; // Set the first one to doing
                foundOne = true;
                break;
            }
        }

        if (foundOne) {
            chrome.storage.local.set({
                [MF_KEYS.ITEMS]: currentItems,
                [MF_KEYS.PROCESSING]: true
            });
            window.close(); // Fermer le popup, le Copilote continue en arrière-plan
        }
    }

});
