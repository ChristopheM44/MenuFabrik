/**
 * Utilitaires de tri partagés — cf. audit 3.3.
 * Remplace 5 occurrences dupliquées du pattern `.sort((a, b) => a.name.localeCompare(b.name, 'fr', ...))`
 */

/**
 * Trie un tableau d'objets ayant une propriété `name` en ordre alphabétique français,
 * insensible à la casse et aux accents.
 */
export function sortByNameFr<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}
