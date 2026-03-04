// Content script that runs on leclercdrive.fr
// MenuFabrik Copilote v2 - Passive observation mode with decentralized state

console.log("MenuFabrik Drive content script (Copilote v2) chargé");

// ---------------------------------------------------------
// ORCHESTRATION DU FLUX (State Machine)
// ---------------------------------------------------------

async function initCopilot() {
    const data = await chrome.storage.local.get(['menufabrik_items', 'menufabrik_processing']);
    if (data.menufabrik_processing && data.menufabrik_items) {
        checkAndProcessCurrentStep(data.menufabrik_items);
    }
}

// Lancer à l'ouverture de la page
initCopilot();

// Lancer si l'utilisateur clique sur "Start" pendant qu'il est déjà sur la page
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.menufabrik_processing && changes.menufabrik_processing.newValue === true) {
        chrome.storage.local.get(['menufabrik_items'], (res) => {
            if (res.menufabrik_items) checkAndProcessCurrentStep(res.menufabrik_items);
        });
    }
});

async function checkAndProcessCurrentStep(items) {
    const doingIndex = items.findIndex(i => i._status === 'doing' && i._selected);

    if (doingIndex !== -1) {
        const item = items[doingIndex];
        const term = item.searchTerm;

        // Vérifier si on a déjà lancé la recherche pour cet article
        const searchDoneFor = sessionStorage.getItem('mf_search_done_for');

        if (searchDoneFor !== term) {
            // Étape 1 : Effectuer la recherche
            console.log(`🔎 Copilote : Lancement de la recherche pour "${term}"`);
            sessionStorage.setItem('mf_search_done_for', term);

            const searchSuccess = await performSearch(term);
            if (!searchSuccess) {
                await finishItem(items, doingIndex, 'err');
                return;
            }

            // On laisse 2 secondes à la page pour soit recharger complètement, soit charger en AJAX
            await new Promise(r => setTimeout(r, 2000));

            // Si la page a rechargé, le reste de ce script est détruit (ce n'est pas grave, initCopilot() reprendra la main sur la nouvelle page).
            // Si on est toujours là (AJAX pur), on passe manuellement à l'étape 2.
            const status = await waitForUserActionOrCartMutation(term);
            await finishItem(items, doingIndex, status);

        } else {
            // Étape 2 : Nous sommes sur la page de résultats (après un rechargement)
            console.log(`🚀 Copilote : Reprise après recherche. Attente ajout pour "${term}"...`);
            const status = await waitForUserActionOrCartMutation(term);
            await finishItem(items, doingIndex, status);
        }
    } else {
        // Personne n'est en "doing", mais on est "processing". Cherchons le prochain.
        // BUG FIX: on excluded 'skipped' from the filter, so skipped items are not re-queued.
        const nextIndex = items.findIndex(i => i._selected && i._status !== 'ok' && i._status !== 'err' && i._status !== 'skipped');
        if (nextIndex !== -1) {
            items[nextIndex]._status = 'doing';
            await chrome.storage.local.set({ 'menufabrik_items': items });
            checkAndProcessCurrentStep(items); // Auto-re-entry
        } else {
            // Fini !
            console.log("✅ MenuFabrik Copilote : Tous les articles sont traités.");
            sessionStorage.removeItem('mf_search_done_for');
            await chrome.storage.local.set({ 'menufabrik_processing': false });
        }
    }
}

async function finishItem(items, index, finalStatus) {
    // Signal spécial : l'utilisateur a mis en pause. On ne change pas le statut (reste 'doing')
    // et on ne passe PAS à l'article suivant. Le popup reprendra depuis ce même article.
    if (finalStatus === '__paused__') {
        console.log("Copilote en pause. Article conservé à l'état 'doing' pour la reprise.");
        return;
    }

    items[index]._status = finalStatus;
    await chrome.storage.local.set({ 'menufabrik_items': items });

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

        const searchButton = document.querySelector('input#inputWRSL301_rechercheBouton, button[title*="Recherche" i], button.btn-search, form[role="search"] button[type="submit"]');
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
        const possibleInput = document.querySelector('input#inputWRSL301_rechercheTexte') ||
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

async function waitForUserActionOrCartMutation(searchTerm) {
    console.log(`🚀 Copilote v2: Attente de l'ajout par l'utilisateur pour '${searchTerm}'...`);

    return new Promise((resolve) => {
        // --- 1. CRÉATION UI COPILOTE ---
        const toolbar = document.createElement('div');
        toolbar.id = 'menufabrik-copilot-toolbar';
        toolbar.className = 'mf-copilot-enter'; // Pour animation
        toolbar.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
            z-index: 2147483647; /* Max z-index */
            padding: 12px 24px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: system-ui, -apple-system, sans-serif;
            border-bottom: 3px solid #0ea5e9;
            transition: border-color 0.3s;
        `;

        const leftContent = document.createElement('div');
        leftContent.style.cssText = "display: flex; align-items: center; gap: 15px;";

        const icon = document.createElement('div');
        icon.style.cssText = "font-size: 24px; animation: mfPulse 2s infinite;";
        icon.innerText = "🛒";

        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
            <div style="font-size: 13px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">MenuFabrik Copilote</div>
            <div style="font-size: 16px; font-weight: 500;">Ajoutez votre <b>${searchTerm}</b> au panier</div>
        `;

        leftContent.appendChild(icon);
        leftContent.appendChild(textDiv);

        const rightContent = document.createElement('div');
        rightContent.style.cssText = "display: flex; gap: 12px;";

        const btnPause = document.createElement('button');
        btnPause.innerText = "⏸ Pause";
        btnPause.title = "Mettre le Copilote en pause. L'article restera en attente.";
        btnPause.style.cssText = `
            background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.4); 
            color: #fbbf24; padding: 8px 16px; border-radius: 6px; cursor: pointer; 
            font-weight: 500; font-size: 14px; transition: all 0.2s;
        `;
        btnPause.onmouseover = () => btnPause.style.background = "rgba(251,191,36,0.25)";
        btnPause.onmouseout = () => btnPause.style.background = "rgba(251,191,36,0.15)";

        const btnPasser = document.createElement('button');
        btnPasser.innerText = "Passer ⏭";
        btnPasser.style.cssText = `
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); 
            color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; 
            font-weight: 500; font-size: 14px; transition: all 0.2s;
        `;
        btnPasser.onmouseover = () => btnPasser.style.background = "rgba(255,255,255,0.2)";
        btnPasser.onmouseout = () => btnPasser.style.background = "rgba(255,255,255,0.1)";

        const btnManualOk = document.createElement('button');
        btnManualOk.innerText = "C'est ajouté ! ✓";
        btnManualOk.title = "Cliquez ici si le copilote ne détecte pas votre ajout automatiquement.";
        btnManualOk.style.cssText = `
            background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); 
            color: #34d399; padding: 8px 16px; border-radius: 6px; cursor: pointer; 
            font-weight: 500; font-size: 14px; transition: all 0.2s; display: none;
        `;
        btnManualOk.onmouseover = () => btnManualOk.style.background = "rgba(16, 185, 129, 0.3)";
        btnManualOk.onmouseout = () => btnManualOk.style.background = "rgba(16, 185, 129, 0.2)";

        rightContent.appendChild(btnPause);
        rightContent.appendChild(btnPasser);
        rightContent.appendChild(btnManualOk);

        toolbar.appendChild(leftContent);
        toolbar.appendChild(rightContent);

        if (!document.getElementById('mf-copilot-global-styles')) {
            const style = document.createElement('style');
            style.id = 'mf-copilot-global-styles';
            style.textContent = `
                @keyframes mfPulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .mf-copilot-enter { animation: mfSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .mf-copilot-exit { animation: mfSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes mfSlideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes mfSlideUp {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(-100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toolbar);

        // Afficher le bouton de secours manuel après 4 secondes si rien ne se passe
        const manualTimeoutInfo = setTimeout(() => {
            btnManualOk.style.display = 'block';
        }, 4000);

        let isResolved = false;
        let cartObserver = null;

        const cleanupAndResolve = (result) => {
            if (isResolved) return;
            isResolved = true;

            clearTimeout(manualTimeoutInfo);
            if (cartObserver) {
                cartObserver.disconnect();
                cartObserver = null;
            }

            toolbar.classList.remove('mf-copilot-enter');
            toolbar.classList.add('mf-copilot-exit');

            setTimeout(() => {
                toolbar.remove();
                setTimeout(() => resolve(result), 500); // Petit délai avant de passer au suivant
            }, 300);
        };

        // --- 2. GESTION DE L'OBSERVATEUR DE PANIER ---
        // Pas besoin du délai de 2s ici, car cette fonction est appelée explicitement
        // soit après un rechargement de page, soit après le délai de 2s déjà intégré à performSearch.

        const cartCounterSelector = '.spanWCRS381_Notification, .badge-panier, [aria-label*="produits dans votre panier"]';
        const initialCartCounterEl = document.querySelector(cartCounterSelector);
        const initialCartValue = initialCartCounterEl ? initialCartCounterEl.textContent.trim() : null;

        console.log(`Copilote v2: Observation du panier démarrée. Compteur actuel: ${initialCartValue || '0'}`);

        const targetNode = document.body;
        const observerConfig = { childList: true, subtree: true, characterData: true };

        const observerCallback = function (mutationsList, observer) {
            if (isResolved) return;

            const currentCounterEl = document.querySelector(cartCounterSelector);
            if (currentCounterEl) {
                const currentValue = currentCounterEl.textContent.trim();

                // Si la valeur a changé, n'est pas vide, et n'est pas le placeholder de chargement
                if (currentValue !== initialCartValue && currentValue !== '' && currentValue !== '...') {
                    console.log(`✅ MenuFabrik: Changement panier détecté ! (${initialCartValue || '0'} -> ${currentValue})`);

                    icon.innerText = "✅";
                    icon.style.animation = "none";
                    textDiv.innerHTML = `<div style="font-size: 16px; font-weight: bold; color: #10b981;">Ajout au panier détecté ! Passage au produit suivant...</div>`;
                    btnPasser.style.display = "none";
                    btnManualOk.style.display = "none";
                    toolbar.style.borderBottomColor = "#10b981";

                    observer.disconnect();

                    setTimeout(() => cleanupAndResolve('ok'), 1500);
                }
            }
        };

        cartObserver = new MutationObserver(observerCallback);
        cartObserver.observe(targetNode, observerConfig);

        // --- 3. ACTIONS MANUELLES ---
        btnPause.onclick = async () => {
            console.log("Copilote: Mise en pause demandée.");
            // Remettre l'article en statut 'doing' (in progress) et stopper le processing.
            // L'article reste en 'doing' pour que "Reprendre" sache où reprendre.
            await chrome.storage.local.set({ 'menufabrik_processing': false });
            cleanupAndResolve('__paused__'); // Signal spécial, ne met PAS à jour le statut
        };

        btnPasser.onclick = () => {
            console.log("Copilote: Article ignoré manuellement.");
            cleanupAndResolve('skipped');
        };

        btnManualOk.onclick = () => {
            console.log("Copilote: Validation forcée manuellement.");
            cleanupAndResolve('ok');
        };

    });
}

