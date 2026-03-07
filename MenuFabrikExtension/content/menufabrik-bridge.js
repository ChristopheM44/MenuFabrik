// Content script that runs on MenuFabrik (localhost, .web.app, etc.)
// Its purpose is to transparently bridge the localStorage data to the extension's chrome.storage.local

console.log("MenuFabrik Bridge script chargé");

let lastExportState = null;

// Vérifier toutes les secondes si une nouvelle liste a été exportée
setInterval(() => {
    try {
        const dataStr = window.localStorage.getItem(MF_KEYS.DRIVE_EXPORT);

        if (dataStr && dataStr !== lastExportState) {
            console.log("MenuFabrik Bridge : Changement détecté dans localStorage (" + MF_KEYS.DRIVE_EXPORT + ")");
            lastExportState = dataStr;

            try {
                const dataObj = JSON.parse(dataStr);

                if (dataObj && dataObj.items && Array.isArray(dataObj.items)) {
                    if (!chrome.runtime?.id) {
                        console.error("MenuFabrik Bridge : Contexte d'extension invalide. Vous DEVEZ rafraîchir cette page (F5).");
                        return;
                    }

                    console.log("MenuFabrik Bridge : Envoi de", dataObj.items.length, "articles à l'extension...");
                    chrome.storage.local.set({ [MF_KEYS.ITEMS]: dataObj.items }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("MenuFabrik Bridge : Erreur de sauvegarde storage.local", chrome.runtime.lastError);
                        } else {
                            console.log("MenuFabrik Bridge : Synchronisation réussie !");
                        }
                    });
                } else {
                    console.log("MenuFabrik Bridge : Format JSON invalide (pas d'items)");
                }
            } catch (parseErr) {
                console.warn("MenuFabrik Bridge : Erreur de parsing JSON", parseErr);
            }
        }
    } catch (err) {
        console.error("MenuFabrik Bridge : Erreur critique boucle", err);
    }
}, 1000);

// Listen to feedback from the leclerc-driver script
document.addEventListener('MF_DRIVE_FEEDBACK', (e) => {
    try {
        window.localStorage.setItem(MF_KEYS.DRIVE_FEEDBACK, e.detail);
        console.log("MenuFabrik Bridge : Feedback sauvegardé dans le localStorage !");
    } catch (err) {
        console.error("MenuFabrik Bridge Erreur sauvegarde Feedback:", err);
    }
});
// Listen to messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'MF_SYNC_FEEDBACK') {
        try {
            window.localStorage.setItem(MF_KEYS.DRIVE_FEEDBACK, JSON.stringify(request.items));
            console.log("MenuFabrik Bridge : Feedback de synchronisation reçu de l'extension et sauvegardé !");
            sendResponse({ success: true });

            // Dispatch a native event so Vue can react immediately if it wants
            document.dispatchEvent(new CustomEvent('MF_SYNC_RECEIVED', { detail: request.items }));
        } catch (err) {
            console.error("MenuFabrik Bridge : Erreur lors de la sauvegarde du feedback", err);
            sendResponse({ success: false, error: err.message });
        }
    }
});
