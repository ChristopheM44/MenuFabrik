// Content script that runs on leclercdrive.fr
// MenuFabrik Copilote v2 — Passive observation mode, decentralized state

console.log("MenuFabrik Drive content script (Copilote v2) chargé");

// ---------------------------------------------------------
// ORCHESTRATION DU FLUX (State Machine)
// ---------------------------------------------------------

async function initCopilot() {
    const data = await chrome.storage.local.get([MF_KEYS.ITEMS, MF_KEYS.PROCESSING]);
    if (data[MF_KEYS.PROCESSING] && data[MF_KEYS.ITEMS]) {
        checkAndProcessCurrentStep(data[MF_KEYS.ITEMS]);
    }
}

// Lancer à l'ouverture de la page
initCopilot();

// Lancer si l'utilisateur clique sur "Start" pendant qu'il est déjà sur la page
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[MF_KEYS.PROCESSING] && changes[MF_KEYS.PROCESSING].newValue === true) {
        chrome.storage.local.get([MF_KEYS.ITEMS], (res) => {
            if (res[MF_KEYS.ITEMS]) checkAndProcessCurrentStep(res[MF_KEYS.ITEMS]);
        });
    }
});

async function checkAndProcessCurrentStep(items) {
    const doingIndex = items.findIndex(i => i._status === 'doing' && i._selected);

    if (doingIndex !== -1) {
        const item = items[doingIndex];
        const term = item.searchTerm;

        // Vérifier si on a déjà lancé la recherche pour cet article
        const searchDoneFor = sessionStorage.getItem(MF_KEYS.SEARCH_DONE);

        if (searchDoneFor !== term) {
            // Étape 1 : Effectuer la recherche
            console.log(`🔎 Copilote : Lancement de la recherche pour "${term}"`);
            sessionStorage.setItem(MF_KEYS.SEARCH_DONE, term);

            const searchSuccess = await performSearch(term);
            if (!searchSuccess) {
                await finishItem(items, doingIndex, 'err');
                return;
            }

            // On laisse 2 secondes à la page pour soit recharger complètement, soit charger en AJAX
            await new Promise(r => setTimeout(r, 2000));

            // Si la page a rechargé, le reste de ce script est détruit (ce n'est pas grave,
            // initCopilot() reprendra la main sur la nouvelle page).
            // Si on est toujours là (AJAX pur), on passe manuellement à l'étape 2.
            const result = await waitForUserActionOrCartMutation(term, item.details || '', item.quantity || 1, item.recipeNames || []);
            await finishItem(items, doingIndex, result.status, result.addedQuantity);

        } else {
            // Étape 2 : Nous sommes sur la page de résultats (après un rechargement)
            console.log(`🚀 Copilote : Reprise après recherche. Attente ajout pour "${term}"...`);
            const result = await waitForUserActionOrCartMutation(term, item.details || '', item.quantity || 1, item.recipeNames || []);
            await finishItem(items, doingIndex, result.status, result.addedQuantity);
        }
    } else {
        // Personne n'est en "doing", mais on est "processing". Cherchons le prochain.
        const nextIndex = items.findIndex(i => i._selected && i._status !== 'ok' && i._status !== 'err' && i._status !== 'skipped');
        if (nextIndex !== -1) {
            items[nextIndex]._status = 'doing';
            await chrome.storage.local.set({ [MF_KEYS.ITEMS]: items });
            checkAndProcessCurrentStep(items); // Auto-re-entry
        } else {
            // Fini !
            console.log("✅ MenuFabrik Copilote : Tous les articles sont traités.");
            sessionStorage.removeItem(MF_KEYS.SEARCH_DONE);
            await chrome.storage.local.set({ [MF_KEYS.PROCESSING]: false });

            // Send feedback back to the web app via CustomEvent (listened by the bridge)
            // We use the cleaned up format like the popup does
            const feedbackItems = items.map(item => ({
                id: item.id,
                name: item.name,
                status: item._status,
                requestedQuantity: item.quantity || 1,
                addedQuantity: item._addedQuantity || 0
            }));

            document.dispatchEvent(new CustomEvent('MF_DRIVE_FEEDBACK', {
                detail: JSON.stringify(feedbackItems)
            }));
        }
    }
}

async function finishItem(items, index, finalStatus, addedQuantity = 0) {
    // Signal spécial : l'utilisateur a mis en pause. On ne change pas le statut (reste 'doing')
    // et on ne passe PAS à l'article suivant. Le popup reprendra depuis ce même article.
    if (finalStatus === '__paused__') {
        console.log("Copilote en pause. Article conservé à l'état 'doing' pour la reprise.");
        return;
    }

    items[index]._status = finalStatus;
    items[index]._addedQuantity = addedQuantity;
    await chrome.storage.local.set({ [MF_KEYS.ITEMS]: items });

    // Attendre un tout petit peu avant d'enchaîner pour la propreté visuelle
    await new Promise(r => setTimeout(r, 800));

    // Déclencher la passe suivante
    checkAndProcessCurrentStep(items);
}

// ---------------------------------------------------------
// ACTIONS DOM E-COMMERCE
// ---------------------------------------------------------

async function performSearch(searchTerm) {
    try {
        const searchInput = await waitForSearchInput();
        if (!searchInput) {
            console.error("MenuFabrik: Barre de recherche introuvable.");
            return false;
        }

        searchInput.value = '';
        searchInput.focus();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(searchInput, searchTerm);
        } else {
            searchInput.value = searchTerm;
        }

        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        const searchButton = document.querySelector(
            'input#inputWRSL301_rechercheBouton, button[title*="Recherche" i], button.btn-search, form[role="search"] button[type="submit"]'
        );
        if (searchButton) {
            searchButton.click();
        } else {
            searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        }

        return true;
    } catch (error) {
        console.error("MenuFabrik Erreur Critique during search:", error);
        return false;
    }
}

async function waitForSearchInput(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const possibleInput =
            document.querySelector('input#inputWRSL301_rechercheTexte') ||
            document.querySelector('input[type="text"][placeholder*="Rechercher" i]') ||
            document.querySelector('input[type="search"]') ||
            document.querySelector('input[id*="echerche" i]') ||
            document.querySelector('input[id*="search" i]');

        if (possibleInput && possibleInput.offsetParent !== null) {
            return possibleInput;
        }
        await new Promise(r => setTimeout(r, 300));
    }
    return null;
}

// ---------------------------------------------------------
// UI COPILOTE — Création du DOM (séparé de la logique)
// ---------------------------------------------------------

/**
 * Crée la toolbar copilote et l'insère dans le DOM.
 * @param {string} searchTerm — Le produit en cours de traitement
 * @param {string} details    — Les détails (ex: "500g")
 * @param {number} quantity   — La quantité à ajouter (>= 1)
 * @param {string[]} recipeNames — Tableaux des noms des recettes associées
 * @returns {{ toolbar, btnPause, btnPasser, btnManualOk, icon, textDiv }}
 */
function createCopilotToolbar(searchTerm, details, quantity, recipeNames = []) {
    const toolbar = document.createElement('div');
    toolbar.id = 'menufabrik-copilot-toolbar';
    toolbar.className = 'mf-copilot-enter';

    const leftContent = document.createElement('div');
    leftContent.className = 'mf-copilot-left';

    const icon = document.createElement('div');
    icon.className = 'mf-copilot-icon';
    icon.innerText = '🛒';

    const textDiv = document.createElement('div');

    const termDisplay = details ? `<b>${searchTerm}</b> (<i>${details}</i>)` : `<b>${searchTerm}</b>`;

    const quantityText = quantity > 1
        ? `Ajoutez <b>${quantity} fois</b> : ${termDisplay} au panier`
        : `Ajoutez ${termDisplay} au panier`;

    let recipesHtml = '';
    if (recipeNames && recipeNames.length > 0) {
        recipesHtml = `<div class="mf-copilot-recipes" style="font-size: 0.85em; opacity: 0.9; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
            📌 <i>Pour : ${recipeNames.join(', ')}</i>
        </div>`;
    }

    textDiv.innerHTML = `
        <div class="mf-copilot-title">MenuFabrik Copilote</div>
        <div class="mf-copilot-instruction">${quantityText}</div>
        ${recipesHtml}
    `;

    leftContent.appendChild(icon);
    leftContent.appendChild(textDiv);

    const rightContent = document.createElement('div');
    rightContent.className = 'mf-copilot-right';

    const btnPause = document.createElement('button');
    btnPause.className = 'mf-btn mf-btn-pause';
    btnPause.innerText = '⏸ Pause';
    btnPause.title = "Mettre le Copilote en pause. L'article restera en attente.";

    const btnPasser = document.createElement('button');
    btnPasser.className = 'mf-btn mf-btn-skip';
    btnPasser.innerText = 'Passer ⏭';

    const btnManualOk = document.createElement('button');
    btnManualOk.className = 'mf-btn mf-btn-manual-ok';
    btnManualOk.innerText = "C'est ajouté ! ✓";
    btnManualOk.title = "Cliquez ici si le copilote ne détecte pas votre ajout automatiquement.";

    rightContent.appendChild(btnPause);
    rightContent.appendChild(btnPasser);
    rightContent.appendChild(btnManualOk);

    toolbar.appendChild(leftContent);
    toolbar.appendChild(rightContent);
    document.body.appendChild(toolbar);

    return { toolbar, btnPause, btnPasser, btnManualOk, icon, textDiv };
}

// ---------------------------------------------------------
// LOGIQUE DE DÉTECTION DU PANIER (isolée et paramétrée)
// ---------------------------------------------------------

/**
 * Observe le compteur du panier et résout quand il a augmenté de `expectedDelta`.
 * @param {string|null} initialValue — La valeur textuelle initiale du compteur
 * @param {number} expectedDelta     — Le nombre d'ajouts attendus (quantity)
 * @returns {Promise<(resolveWith: string) => void>} resolve — Fonction à appeler pour stopper l'observation
 */
function createCartObserver(initialValue, onUpdate) {
    const cartCounterSelector = '.spanWCRS381_Notification, .badge-panier, [aria-label*="produits dans votre panier"]';
    const initialNumericValue = parseInt(initialValue, 10) || 0;

    console.log(`Copilote v2: Observation du panier démarrée. Compteur actuel: ${initialValue || '0'}`);

    const observerCallback = function (mutationsList, observer) {
        const currentCounterEl = document.querySelector(cartCounterSelector);
        if (!currentCounterEl) return;

        const currentValue = currentCounterEl.textContent.trim();
        if (currentValue === '' || currentValue === '...') return;

        const currentNumericValue = parseInt(currentValue, 10);
        if (isNaN(currentNumericValue)) return;

        // On notifie chaque changement
        onUpdate(currentNumericValue);
    };

    const targetNode = document.body;
    const observerConfig = { childList: true, subtree: true, characterData: true };
    const cartObserver = new MutationObserver(observerCallback);
    cartObserver.observe(targetNode, observerConfig);

    return cartObserver;
}

// ---------------------------------------------------------
// ORCHESTRATEUR UI + OBSERVATION (simplifié)
// ---------------------------------------------------------

/**
 * Affiche la toolbar copilote et attend l'action de l'utilisateur ou la détection du panier.
 * @param {string} searchTerm — L'article en cours de traitement
 * @param {string} details    — La quantité réelle (ex: "500g")
 * @param {number} quantity   — Le nombre d'ajouts attendus
 * @param {string[]} recipeNames — Tableaux des noms des recettes associées
 * @returns {Promise<string>} — Statut final : 'ok', 'skipped', 'err', '__paused__'
 */
async function waitForUserActionOrCartMutation(searchTerm, details = '', quantity = 1, recipeNames = []) {
    console.log(`🚀 Copilote v2: Attente de l'ajout par l'utilisateur pour '${searchTerm}' (×${quantity})...`);

    return new Promise((resolve) => {
        const { toolbar, btnPause, btnPasser, btnManualOk, icon, textDiv } = createCopilotToolbar(searchTerm, details, quantity, recipeNames);

        let currentAddedQuantity = 0;

        // Afficher le bouton de secours manuel après 4 secondes si rien ne se passe
        const manualTimeoutId = setTimeout(() => {
            btnManualOk.style.display = 'block';
        }, 4000);

        let isResolved = false;
        let cartObserver = null;

        const cleanupAndResolve = (status, added) => {
            if (isResolved) return;
            isResolved = true;

            clearTimeout(manualTimeoutId);
            if (cartObserver) {
                cartObserver.disconnect();
                cartObserver = null;
            }

            toolbar.classList.remove('mf-copilot-enter');
            toolbar.classList.add('mf-copilot-exit');

            setTimeout(() => {
                toolbar.remove();
                setTimeout(() => resolve({ status, addedQuantity: added }), 500); // Petit délai avant le produit suivant
            }, 300);
        };

        // Lire la valeur initiale du compteur de panier
        const cartCounterSelector = '.spanWCRS381_Notification, .badge-panier, [aria-label*="produits dans votre panier"]';
        const initialCounterEl = document.querySelector(cartCounterSelector);
        const initialCartValue = initialCounterEl ? initialCounterEl.textContent.trim() : null;
        const initialNumericValue = parseInt(initialCartValue, 10) || 0;

        // Démarrer l'observateur de panier (notifie à chaque changement)
        cartObserver = createCartObserver(initialCartValue, (finalNumericValue) => {
            if (isResolved) return;

            const realDelta = finalNumericValue - initialNumericValue;
            currentAddedQuantity = realDelta;
            console.log(`Copilote: Panier mis à jour. Delta actuel: ${currentAddedQuantity}/${quantity}`);

            // Si on a atteint ou dépassé la cible, on valide automatiquement
            if (currentAddedQuantity >= quantity) {
                // Mise à jour UI : succès détecté
                icon.innerText = '✅';
                icon.className = 'mf-copilot-icon mf-copilot-icon--static';
                textDiv.innerHTML = '<div class="mf-copilot-success-text">Ajout au panier détecté ! Passage au produit suivant...</div>';
                btnPasser.style.display = 'none';
                btnManualOk.style.display = 'none';
                toolbar.classList.add('mf-state-success');

                setTimeout(() => cleanupAndResolve('ok', currentAddedQuantity), 1500);
            }
        });

        // Actions manuelles
        btnPause.onclick = async () => {
            console.log("Copilote: Mise en pause demandée.");
            await chrome.storage.local.set({ [MF_KEYS.PROCESSING]: false });
            cleanupAndResolve('__paused__', currentAddedQuantity);
        };

        btnPasser.onclick = () => {
            console.log("Copilote: Article ignoré manuellement.");
            cleanupAndResolve('skipped', currentAddedQuantity);
        };

        btnManualOk.onclick = () => {
            console.log("Copilote: Validation forcée manuellement.");
            // On fait le pari que si l'utilisateur appuie, il a bien mis la quantité voulue
            cleanupAndResolve('ok', quantity);
        };
    });
}
