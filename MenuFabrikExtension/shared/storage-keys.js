// shared/storage-keys.js
// Constantes centralisées pour éviter les fautes de frappe sur les clés de stockage.
// Exposées via window.MF_KEYS (pattern IIFE, compatible avec les content scripts Chrome MV3).

window.MF_KEYS = Object.freeze({
    // Clés chrome.storage.local
    ITEMS: 'menufabrik_items',
    PROCESSING: 'menufabrik_processing',

    // Clé localStorage (bridge MenuFabrik Web → Extension)
    DRIVE_EXPORT: 'menufabrik_drive_export',
    DRIVE_FEEDBACK: 'menufabrik_drive_feedback',

    // Clé sessionStorage (état de recherche par onglet)
    SEARCH_DONE: 'mf_search_done_for',
});

