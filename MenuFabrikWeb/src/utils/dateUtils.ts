/**
 * Utilitaires de dates partagés — remplace la logique dupliquée présente
 * dans useMealsPlanningData et MealDetailView (audit 2.6).
 */

/**
 * Retourne la date au format YYYY-MM-DD en heure locale (évite les décalages UTC).
 * Firestore stocke les dates en ISO string mais les compare en UTC.
 */
export const getLocalISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formate un ISO date string (YYYY-MM-DD ou ISO complet) en label localisé fr-FR.
 * Exemple : "2025-03-22" → "Samedi 22 mars"
 * Gère la compensation de fuseau horaire pour éviter les décalages J-1.
 */
export const formatDateLabel = (dateStr: string | Date): string => {
    try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return String(dateStr);

        // Compensation fuseau horaire : on recompose la date locale sans la convertir en UTC
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localStr = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
        if (!localStr) return String(dateStr);

        const parts = localStr.split('-');
        if (parts.length < 3) return String(dateStr);

        const year  = parseInt(parts[0] || '1970', 10);
        const month = parseInt(parts[1] || '1',    10) - 1;
        const day   = parseInt(parts[2] || '1',    10);

        const localDate = new Date(year, month, day);
        const label = new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).format(localDate);

        return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
        return String(dateStr);
    }
};
