import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();

export const analyzeRecipeWithGemini = onCall(
    {
        cors: true // Required for web apps
    },
    async (request: CallableRequest) => {
        // Verifying that the user is authenticated.
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "Vous devez être connecté pour utiliser l'IA."
            );
        }

        const inputData = request.data;
        const instructions = inputData.instructions || "";
        const sourceUrl = inputData.sourceUrl || "";

        if (!instructions && !sourceUrl) {
            throw new HttpsError(
                "invalid-argument",
                "Veuillez fournir des instructions ou une URL à analyser."
            );
        }

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("La clé API Gemini (GEMINI_API_KEY) n'est pas configurée dans les variables d'environnement.");
            }
            const gGenAI = new GoogleGenAI({ apiKey: apiKey });

            let promptText = "";
            if (sourceUrl) {
                promptText += `Analyse la recette contenue à cette URL (${sourceUrl}). `;
            }
            if (instructions) {
                promptText += `Analyse également ces instructions/notes : ${instructions}. `;
            }

            promptText += `
Extrais la liste structurée des ingrédients, la catégorie de la recette, le temps de préparation en minutes, et les allergènes potentiels.

Réponds UNIQUEMENT avec un objet JSON strictement formaté comme ce schéma (sans aucun markdown, sans "\`\`\`json", juste l'objet) :
{
  "category": "Viandes" | "Poissons" | "Végétarien" | "Rapide" | "Au Four" | "Pâtes" | "Soupes" | "Salades" | "Fast Food" | "Autre",
  "prepTime": 30,
  "ingredients": [
    {
      "name": "Tomate",
      "quantity": 2,
      "unit": "pièces"
    }
  ],
  "allergens": ["Gluten", "Lactose"]
}
Note : Le tableau "allergens" contient les noms des allergènes détectés en chaîne de caractères. Si aucun allergène, renvoie []. L'unité de l'ingrédient peut être vide, g, ml, cuillères...
      `;

            // Call Gemini 2.5 Flash
            const response = await gGenAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: promptText
            });

            const responseText = response.text || "{}";

            // Nettoyage strict (retrait des blocs markdown potentiels)
            const cleanJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

            const parsedData = JSON.parse(cleanJsonStr);

            return {
                success: true,
                data: parsedData
            };

        } catch (error: any) {
            console.error("Gemini AI API Error:", error);
            throw new HttpsError("internal", "Erreur lors de l'analyse IA: " + error.message);
        }
    }
);
