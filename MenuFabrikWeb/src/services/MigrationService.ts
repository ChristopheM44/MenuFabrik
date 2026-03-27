import { collection, doc, getDocs, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { commitInChunks } from '../utils/firestoreBatch';

/**
 * Service de migration Firestore pour les changements de schéma.
 * Chaque migration est identifiée par un numéro de version.
 * Le profil utilisateur stocke `migrationVersion` pour ne jamais relancer une migration déjà appliquée.
 */
export class MigrationService {

    private static CURRENT_VERSION = 1;

    /**
     * Exécute toutes les migrations nécessaires pour l'utilisateur.
     * À appeler après l'initialisation de l'espace utilisateur.
     */
    static async runIfNeeded(uid: string): Promise<void> {
        const profileRef = doc(db, 'users', uid, 'profile', 'data');
        const profileSnap = await getDoc(profileRef);
        const currentVersion = profileSnap.data()?.migrationVersion ?? 0;

        if (currentVersion >= this.CURRENT_VERSION) return;

        console.log(`[Migration] Utilisateur ${uid} : v${currentVersion} → v${this.CURRENT_VERSION}`);

        if (currentVersion < 1) {
            await this.migrateCategoryToCategories(uid);
        }

        // Marquer la version actuelle
        await updateDoc(profileRef, { migrationVersion: this.CURRENT_VERSION });
        console.log('[Migration] Terminée.');
    }

    /**
     * Migration v1 : category (string) → categories (string[])
     * Pour chaque recette qui a un champ `category` mais pas de `categories`,
     * on crée `categories: [category]` et on supprime l'ancien champ.
     */
    private static async migrateCategoryToCategories(uid: string): Promise<void> {
        const recipesRef = collection(db, 'users', uid, 'recipes');
        const snapshot = await getDocs(recipesRef);

        const toMigrate = snapshot.docs.filter(d => {
            const data = d.data();
            return data.category && !data.categories;
        });

        if (toMigrate.length === 0) {
            console.log('[Migration v1] Aucune recette à migrer.');
            return;
        }

        console.log(`[Migration v1] Migration de ${toMigrate.length} recettes : category → categories`);

        await commitInChunks(toMigrate, (batch, recipeDoc) => {
            const ref = doc(db, 'users', uid, 'recipes', recipeDoc.id);
            batch.update(ref, {
                categories: [recipeDoc.data().category],
                category: deleteField()
            });
        });
    }
}
