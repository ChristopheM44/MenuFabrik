<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import { useAllergenStore } from '../stores/allergenStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { useToast } from 'primevue/usetoast';

import type { Recipe, RecipeCategory } from '../models/Recipe';
import { MealType } from '../models/Recipe';
import type { SharedRecipePayload } from '../services/RecipeShareService';

import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import Rating from 'primevue/rating';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const recipeStore = useRecipeStore();
const allergenStore = useAllergenStore();
const sideDishStore = useSideDishStore();

const decodedRecipe = ref<SharedRecipePayload | null>(null);
const isDecodingError = ref(false);
const isImporting = ref(false);

const getSeverityForMealType = (type: string) => {
    switch (type) {
        case 'Midi': return 'info';
        case 'Soir': return 'contrast';
        case 'Les Deux': return 'success';
        default: return 'secondary';
    }
};

onMounted(() => {
    const dataParam = route.query.data as string;
    if (!dataParam) {
        isDecodingError.value = true;
        return;
    }

    try {
        // Decode Base64 -> URI Component -> JSON
        const jsonStr = decodeURIComponent(atob(dataParam));
        const parsed = JSON.parse(jsonStr);

        // Validation minimale du payload (1.6)
        if (!parsed || typeof parsed !== 'object' || typeof parsed.n !== 'string' || !parsed.n.trim()) {
            throw new Error('Payload incomplet ou mal formé');
        }

        decodedRecipe.value = parsed as SharedRecipePayload;
    } catch (error) {
        console.error("Erreur de décodage du lien de partage:", error);
        isDecodingError.value = true;
    }
});

const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
};

const handleImport = async () => {
    if (!decodedRecipe.value) return;
    
    isImporting.value = true;
    try {
        // 1. Initialiser les stores nécessaires
        await Promise.all([
            allergenStore.ensureReady(),
            sideDishStore.ensureReady()
        ]);
        
        const payload = decodedRecipe.value;
        const newAllergenIds: string[] = [];
        const newSideDishIds: string[] = [];

        // 2. Résolution des Allergènes (Création à la volée si manquant)
        if (payload.al && payload.al.length > 0) {
            for (const allergenName of payload.al) {
                const existing = allergenStore.allergens.find(a => a.name.toLowerCase() === allergenName.toLowerCase());
                if (existing?.id) {
                    newAllergenIds.push(existing.id);
                } else {
                    // Création — addAllergen retourne l'objet complet avec id
                    const newAllergen = await allergenStore.addAllergen({ name: allergenName });
                    const createdId = (newAllergen as { id?: string } | null)?.id;
                    if (createdId) newAllergenIds.push(createdId);
                }
            }
        }

        // 3. Résolution des Accompagnements (Création à la volée si manquant)
        if (payload.sd && payload.sd.length > 0) {
            for (const sideName of payload.sd) {
                const existing = sideDishStore.sideDishes.find(s => s.name.toLowerCase() === sideName.toLowerCase());
                if (existing?.id) {
                    newSideDishIds.push(existing.id);
                } else {
                    // Création — addSideDish retourne l'objet complet avec id
                    const newSide = await sideDishStore.addSideDish({ name: sideName });
                    const createdId = (newSide as { id?: string } | null)?.id;
                    if (createdId) newSideDishIds.push(createdId);
                }
            }
        }

        // 4. Construction de la recette
        const newRecipe: Omit<Recipe, 'id'> = {
            name: payload.n,
            prepTime: payload.p || 30,
            mealType: (payload.m as MealType) || MealType.BOTH,
            category: (payload.c as RecipeCategory) || 'Autre',
            requiresFreeTime: payload.r || false,
            allergenIds: newAllergenIds,
            suggestedSideIds: newSideDishIds,
            instructions: payload.i || '',
            sourceURL: payload.s || '',
            rating: payload.rt || 0,
            ingredients: payload.ing?.map(ing => ({
                name: ing.n,
                quantity: ing.q,
                unit: ing.u,
                department: ing.d
            })) || []
        };

        // 5. Sauvegarde
        const createdId = await recipeStore.addRecipe(newRecipe);
        
        toast.add({ 
            severity: 'success', 
            summary: 'Livre de Recettes mis à jour', 
            detail: `${payload.n} a été ajoutée avec succès !`, 
            life: 4000 
        });

        // 6. Navigation
        if (createdId) {
            router.push(`/recipes/${createdId}`);
        } else {
            router.push('/recipes');
        }

    } catch (e: any) {
        console.error("Erreur lors de l'import:", e);
        toast.add({ severity: 'error', summary: "Erreur d'import", detail: e.message, life: 5000 });
    } finally {
        isImporting.value = false;
    }
};

const goBackToHome = () => {
    router.replace('/recipes');
};
</script>

<template>
    <div class="import-recipe-view w-full max-w-2xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] animate-fadein">
        
        <div v-if="isDecodingError" class="text-center bg-surface-0 dark:bg-surface-900 p-8 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700">
            <i class="pi pi-times-circle text-6xl text-red-500 mb-4"></i>
            <h1 class="text-2xl font-bold mb-2">Lien invalide ou expiré</h1>
            <p class="text-surface-500 dark:text-surface-400 mb-6">Nous n'avons pas pu décoder la recette partagée. Demandez à votre contact de re-générer un lien.</p>
            <Button label="Retourner à l'accueil" icon="pi pi-home" severity="secondary" @click="goBackToHome" />
        </div>

        <div v-else-if="!decodedRecipe" class="flex flex-col items-center justify-center p-12">
            <ProgressSpinner strokeWidth="4" />
            <p class="mt-4 text-surface-500 dark:text-surface-400 text-sm animate-pulse">Décompression de la recette...</p>
        </div>

        <div v-else class="w-full bg-surface-0 dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header de l'import -->
            <div class="bg-primary-500 p-8 text-white relative overflow-hidden">
                <i class="pi pi-gift absolute -right-6 -bottom-6 text-9xl text-white/10 rotate-12 pointer-events-none"></i>
                <div class="relative z-10 flex flex-col items-center text-center">
                    <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <i class="pi pi-envelope text-3xl"></i>
                    </div>
                    <h2 class="text-lg font-medium text-white/80 mb-1">On vous a partagé une recette !</h2>
                    <h1 class="text-3xl font-bold font-serif">{{ decodedRecipe.n }}</h1>
                </div>
            </div>

            <!-- Previsualisation du contenu -->
            <div class="p-6 md:p-8 flex flex-col gap-6">
                
                <div class="flex flex-wrap justify-center gap-3">
                    <Tag :value="decodedRecipe.c || 'Autre'" severity="secondary" rounded class="px-3" />
                    <Tag :value="decodedRecipe.m" :severity="getSeverityForMealType(decodedRecipe.m)" rounded class="px-3" />
                    <Tag icon="pi pi-clock" :value="formatTime(decodedRecipe.p)" severity="secondary" rounded class="px-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300" />
                    <Rating v-if="decodedRecipe.rt && decodedRecipe.rt > 0" :modelValue="decodedRecipe.rt" readonly :cancel="false" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div v-if="decodedRecipe.ing && decodedRecipe.ing.length > 0" class="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                        <h3 class="font-bold flex items-center gap-2 mb-3 text-surface-900 dark:text-surface-0"><i class="pi pi-shopping-bag text-primary-500"></i> {{ decodedRecipe.ing.length }} Ingrédients</h3>
                        <div class="flex flex-wrap gap-2 text-sm text-surface-600 dark:text-surface-300">
                            <span v-for="(ing, i) in decodedRecipe.ing.slice(0, 5)" :key="i" class="bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded">
                                {{ ing.n }}
                            </span>
                            <span v-if="decodedRecipe.ing.length > 5" class="italic text-surface-400 dark:text-surface-500">
                                + {{ decodedRecipe.ing.length - 5 }} autres...
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-3">
                        <div v-if="decodedRecipe.al && decodedRecipe.al.length > 0" class="text-sm">
                            <span class="font-bold text-orange-500 flex items-center gap-1 mb-1"><i class="pi pi-exclamation-triangle"></i> Allergènes:</span>
                            <div class="flex flex-wrap gap-1">
                                <span v-for="al in decodedRecipe.al" :key="al">{{ al }}<span v-if="decodedRecipe.al.indexOf(al) !== decodedRecipe.al.length - 1">, </span></span>
                            </div>
                        </div>
                        
                        <div v-if="decodedRecipe.sd && decodedRecipe.sd.length > 0" class="text-sm">
                            <span class="font-bold text-green-500 flex items-center gap-1 mb-1"><i class="pi pi-tags"></i> Suggestions:</span>
                            <div class="flex flex-wrap gap-1">
                                <span v-for="sd in decodedRecipe.sd" :key="sd">{{ sd }}<span v-if="decodedRecipe.sd.indexOf(sd) !== decodedRecipe.sd.length - 1">, </span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alert de copie -->
                <div class="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-sm border border-blue-200 dark:border-blue-800 flex gap-3">
                    <i class="pi pi-info-circle text-lg mt-0.5"></i>
                    <p>En l'enregistrant, une copie indépendante sera créée dans votre carnet personnel. Les allergènes et accompagnements manquants seront créés. Vous pourrez la modifier à volonté.</p>
                </div>

                <!-- Actions -->
                <div class="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button label="Ignorer" severity="secondary" outlined class="flex-1" @click="goBackToHome" />
                    <Button label="Enregistrer la Recette" icon="pi pi-download" class="flex-1 font-bold shadow-md" @click="handleImport" :loading="isImporting" />
                </div>

            </div>
        </div>

    </div>
</template>

<style scoped>
</style>
