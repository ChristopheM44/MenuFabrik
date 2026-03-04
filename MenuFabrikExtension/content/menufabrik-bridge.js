// Content script that runs on MenuFabrik (localhost, .web.app, etc.)
// Its purpose is to transparently bridge the localStorage data to the extension's chrome.storage.local

console.log("MenuFabrik Bridge script chargé");

let lastExportState = null;

// Vérifier toutes les secondes si une nouvelle liste a été exportée
setInterval(() => {
    try {
        const dataStr = window.localStorage.getItem(MF_KEYS.DRIVE_EXPORT);

        if (dataStr && dataStr !== lastExportState) {
            // Identifier le changement avant de parser
            lastExportState = dataStr;

            try {
                const dataObj = JSON.parse(dataStr);

                if (dataObj && dataObj.items && Array.isArray(dataObj.items)) {
                    // Vérification de sécurité: si l'extension a été rechargée, le contexte est invalide
                    if (!chrome.runtime?.id) {
                        console.warn("MenuFabrik Bridge : Contexte d'extension invalide. Veuillez recharger cette page.");
                        return;
                    }

                    // Sauvegarder dans le storage de l'extension
                    chrome.storage.local.set({ [MF_KEYS.ITEMS]: dataObj.items }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("MenuFabrik Bridge : Erreur de sauvegarde", chrome.runtime.lastError);
                        } else {
                            console.log("MenuFabrik Bridge : Nouvelle liste détectée et synchronisée avec l'extension ! (" + dataObj.items.length + " articles)");
                        }
                    });
                } else {
                    console.log("MenuFabrik Bridge : JSON parsé mais ne contient pas d'items valides.");
                }
            } catch (parseErr) {
                console.warn("MenuFabrik Bridge Erreur de parsing JSON pour la chaîne:", dataStr, parseErr);
            }
        }
    } catch (err) {
        console.error("MenuFabrik Bridge Erreur générale d'accès", err);
    }
}, 1000);
