/**
 * Helper partagé pour nettoyer un objet avant envoi à Firestore.
 * Firestore crashe si des champs ont la valeur `undefined`.
 */
export const cleanForFirestore = (obj: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
