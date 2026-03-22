import { collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Allergen } from '../models/Allergen';
import type { SideDish } from '../models/SideDish';

import { commitInChunks } from '../utils/firestoreBatch';
import { predefinedAllergens, predefinedSideDishes, predefinedRecipes, type RawRecipeData } from '../data/seedData';

const clearCollection = async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    await commitInChunks(querySnapshot.docs, (batch, document) => {
        batch.delete(document.ref);
    });
};

export const seedDatabase = async () => {
    try {
        console.log("Démarrage du DataSeeder Web (Mode Base Publique Centrale)...");

        console.log("Nettoyage des anciennes données publiques...");
        await clearCollection('public_recipes');
        await clearCollection('public_sideDishes');
        await clearCollection('public_allergens');

        // --- 1. ALLERGÈNES ---

        // Map pour garder les IDs générés (nom -> id)
        const allergensMap = new Map<string, string>();

        const allAllergensToCommit: { ref: any, allergen: Allergen }[] = [];
        predefinedAllergens.forEach(name => {
            const ref = doc(collection(db, 'public_allergens'));
            allergensMap.set(name, ref.id);
            allAllergensToCommit.push({ ref, allergen: { name } });
        });

        await commitInChunks(allAllergensToCommit, (batch, item) => {
            batch.set(item.ref, item.allergen);
        });


        // --- 2. ACCOMPAGNEMENTS (SideDishes) ---

        const sideDishesMap = new Map<string, string>();

        const allSidesToCommit: { ref: any, side: SideDish }[] = [];
        predefinedSideDishes.forEach(name => {
            const ref = doc(collection(db, 'public_sideDishes'));
            sideDishesMap.set(name, ref.id);
            allSidesToCommit.push({ ref, side: { name } });
        });

        await commitInChunks(allSidesToCommit, (batch, item) => {
            batch.set(item.ref, item.side);
        });


        // --- 3. RECETTES ---
        // Resolver map pour remplacer les noms d'allergènes/sides par leurs vrais IDs fraîchement générés
        const mappedRecipes = predefinedRecipes.map<RawRecipeData>(r => ({
            ...r,
            allergenIds: r.allergenIds.map(name => allergensMap.get(name)!).filter(Boolean),
            suggestedSideIds: r.suggestedSideIds.map(name => sideDishesMap.get(name)!).filter(Boolean)
        }));

        console.log("Envoi des recettes vers Firestore en lots...");
        await commitInChunks(mappedRecipes, (batch, r) => {
            const rRef = doc(collection(db, 'public_recipes'));
            batch.set(rRef, r);
        });

        console.log("La base publique a été injectée avec succès ! ✅");

    } catch (error) {
        console.error("Erreur lors de l'injection :", error);
        throw error;
    }
};
