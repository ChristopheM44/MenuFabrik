import type { RecipeCategory } from '../models/Recipe';
import type { Allergen } from '../models/Allergen';
import type { SideDish } from '../models/SideDish';

export interface AIAnalysisResult {
    name?: string;
    instructions?: string;
    categories?: RecipeCategory[];
    prepTime?: number;
    servings?: number;
    ingredients?: { name: string; quantity?: number; unit?: string }[];
    allergens?: string[];
    sideDishes?: string[];
}

type GeminiErrorPayload = {
    error?: {
        message?: string;
        status?: string;
    };
};

const parseGeminiErrorBody = (body: string): string => {
    if (!body) {
        return "";
    }

    try {
        const payload = JSON.parse(body) as GeminiErrorPayload;
        return payload.error?.message || payload.error?.status || body;
    } catch {
        return body;
    }
};

const buildGeminiNetworkError = async (response: Response): Promise<Error> => {
    const body = await response.text();
    const details = parseGeminiErrorBody(body).trim();
    const statusLabel = response.statusText || "réponse refusée";

    if (response.status === 503) {
        return new Error("Gemini est momentanement surcharge, merci de reessayer dans quelques instants.");
    }

    const message = details
        ? `Erreur Gemini (${response.status} ${statusLabel}) : ${details}`
        : `Erreur Gemini (${response.status} ${statusLabel})`;

    return new Error(message);
};

export class GeminiService {
    /**
     * Analyse une recette depuis une URL ou du texte avec l'API Gemini 2.5 Flash
     */
    static async analyzeRecipe(
        sourceURL: string,
        instructions: string,
        availableSideDishes: SideDish[]
    ): Promise<AIAnalysisResult> {

        // --- NOTE SUR L'ARCHITECTURE ---
        // L'appel à l'API Gemini est volontairement conservé côté client (Frontend) 
        // pour rester sur le plan Firebase SPARK (gratuit). 
        // Le passage à une Cloud Function masquerait cette clé mais imposerait 
        // le passage au plan payant BLAZE.
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("La clé d'API Gemini est manquante (VITE_GEMINI_API_KEY).");
        }

        if (!instructions && !sourceURL) {
            throw new Error("Veuillez fournir des instructions ou un lien web pour lancer l'analyse IA.");
        }

        let promptText = "";
        if (sourceURL) {
            promptText += `Analyse la recette contenue à cette URL (${sourceURL}). `;
        }
        if (instructions) {
            promptText += `Analyse également ces instructions/notes : ${instructions}. `;
        }

        const availableSidesNames = availableSideDishes.map(s => s.name).join(", ");

        promptText += `
**CONSIGNES STRICTES :**
1. Tu es un extracteur de données. Tu DOIS extraire EXACTEMENT les ingrédients présents dans le texte ou la page web, sans rien inventer.
2. Structure la liste des ingrédients de manière précise. Si le texte dit "oignon - 200 g d'oignon émincés", extrait: name="Oignon", quantity=200, unit="g".
3. Déduis l'unité si elle est absente mais implicite. Par exemple, "1 reblochon" devient quantity=1, unit="pièce".
4. Extrais les instructions étape par étape.
5. Suggère 1 à 3 accompagnements appropriés pour ce plat, choisis **UNIQUEMENT** parmi cette liste stricte : [${availableSidesNames}]. S'il s'agit d'un plat complet (ex: Tartiflette), laisse le tableau vide.
6. Extrais le nombre de parts (servings) indiqué dans la recette. Si non précisé, utilise 4 par défaut.
7. Attribue 1 à 3 catégories pertinentes au plat. Par exemple un hachis parmentier peut être à la fois "Viandes", "Au Four" et "Sans Gluten". Mets au minimum 1 catégorie.

Réponds UNIQUEMENT avec un objet JSON strictement formaté (sans bloc markdown \`\`\`json) :
{
  "name": "Nom du plat trouvé",
  "instructions": "1. Faire chauffer...\\n2. Ajouter...",
  "categories": ["Viandes", "Au Four"],
  "prepTime": 30,
  "servings": 4,
  "ingredients": [
    {"name": "Reblochon", "quantity": 1, "unit": "pièce(s)"},
    {"name": "Pomme de terre", "quantity": 1, "unit": "kg"}
  ],
  "allergens": ["Gluten"],
  "sideDishes": ["Salade verte", "Pain"]
}`;

        let response: Response;
        try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "connexion impossible";
            throw new Error(`Impossible de joindre Gemini : ${message}`);
        }

        if (!response.ok) {
            throw await buildGeminiNetworkError(response);
        }

        const resData = await response.json();
        const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Nettoyage strict du markdown pour s'assurer d'avoir un JSON parseable
        const cleanJsonStr = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        let aiData: AIAnalysisResult;
        try {
            aiData = JSON.parse(cleanJsonStr);
        } catch (e) {
            throw new Error("Impossible de décoder la réponse de l'IA. La structure n'est pas un JSON valide.");
        }

        return aiData;
    }

    /**
     * Map les données IA (chaînes de caractères) aux références locales (IDs)
     */
    static mapAllergens(aiAllergens: string[] | undefined, localStoreAllergens: Allergen[]): string[] {
        if (!aiAllergens || !Array.isArray(aiAllergens)) return [];

        const matchedIds: string[] = [];
        for (const aiAllergen of aiAllergens) {
            const found = localStoreAllergens.find(a => a.name.toLowerCase() === aiAllergen.toLowerCase());
            if (found && found.id) {
                matchedIds.push(found.id);
            }
        }
        return matchedIds;
    }

    static mapSideDishes(aiSideDishes: string[] | undefined, localStoreSides: SideDish[]): string[] {
        if (!aiSideDishes || !Array.isArray(aiSideDishes)) return [];

        const matchedSideIds: string[] = [];
        for (const aiSide of aiSideDishes) {
            // Fuzzy matching simple
            const found = localStoreSides.find(s =>
                s.name.toLowerCase().includes(aiSide.toLowerCase()) ||
                aiSide.toLowerCase().includes(s.name.toLowerCase())
            );
            if (found && found.id) {
                matchedSideIds.push(found.id);
            }
        }
        return matchedSideIds;
    }
}
