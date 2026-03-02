import type { Recipe } from '../models/Recipe';
import { useAllergenStore } from '../stores/allergenStore';
import { useSideDishStore } from '../stores/sideDishStore';

/**
 * Payload optimisée pour l'URL. 
 * On retire les IDs locaux et on utilise les noms textuels pour les relations.
 */
export interface SharedRecipePayload {
    n: string; // name
    p: number; // prepTime
    m: string; // mealType
    c: string; // category
    r: boolean; // requiresFreeTime
    i?: string; // instructions
    s?: string; // sourceURL
    rt?: number; // rating

    // Noms au lieu d'IDs
    al?: string[]; // allergen names
    sd?: string[]; // side dish names

    // Ingredients
    ing?: Array<{
        n: string; // name
        q?: number; // quantity
        u?: string; // unit
        d?: string; // department
    }>;
}

export class RecipeShareService {

    /**
     * Convertit une Recipe locale en URL de partage
     */
    static async generateShareLink(recipe: Recipe): Promise<string> {
        const allergenStore = useAllergenStore();
        const sideDishStore = useSideDishStore();

        // Récupérer les noms correspondants aux IDs
        const allergenNames = recipe.allergenIds
            .map(id => allergenStore.allergens.find(a => a.id === id)?.name)
            .filter(name => name !== undefined) as string[];

        const sideNames = recipe.suggestedSideIds
            .map(id => sideDishStore.sideDishes.find(s => s.id === id)?.name)
            .filter(name => name !== undefined) as string[];

        // Construire la payload compacte
        const payload: SharedRecipePayload = {
            n: recipe.name,
            p: recipe.prepTime,
            m: recipe.mealType,
            c: recipe.category,
            r: recipe.requiresFreeTime,
            i: recipe.instructions,
            s: recipe.sourceURL,
            rt: recipe.rating,
            al: allergenNames.length > 0 ? allergenNames : undefined,
            sd: sideNames.length > 0 ? sideNames : undefined,
            ing: recipe.ingredients?.map(ing => ({
                n: ing.name,
                q: ing.quantity,
                u: ing.unit,
                d: ing.department
            }))
        };

        // Supprimer les champs undefined pour alléger l'URL
        Object.keys(payload).forEach(key => {
            if ((payload as any)[key] === undefined) {
                delete (payload as any)[key];
            }
        });

        // Encoder en JSON -> URI Component -> Base64
        const jsonStr = JSON.stringify(payload);
        const encoded = btoa(encodeURIComponent(jsonStr));

        // Construire l'URL finale
        const baseUrl = window.location.origin;
        return `${baseUrl}/import?data=${encoded}`;
    }

    /**
     * Partage via l'API native (mobile) ou copie dans le presse-papier
     */
    static async shareOrCopy(recipe: Recipe): Promise<{ copied: boolean, shared: boolean }> {
        try {
            const url = await this.generateShareLink(recipe);
            const shareData = {
                title: `Recette : ${recipe.name}`,
                text: `Découvre ma recette de ${recipe.name} sur MenuFabrik !`,
                url: url
            };

            // Tentative de Web Share API (mobile/safari)
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return { copied: false, shared: true };
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(url);
                return { copied: true, shared: false };
            }
        } catch (error) {
            console.error("Erreur lors du partage :", error);
            // Si erreur (ex: refu utilisateur), on tente quand même la copie
            const url = await this.generateShareLink(recipe);
            await navigator.clipboard.writeText(url);
            return { copied: true, shared: false };
        }
    }
}
