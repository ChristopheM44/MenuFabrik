<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useMealStore } from '../stores/mealStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useSideDishStore } from '../stores/sideDishStore';

import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';

const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const sideDishStore = useSideDishStore();

const datesRange = ref<Date[]>([]);
const copySuccess = ref(false);

const isDataReady = computed(() => {
    return !recipeStore.isLoading && !mealStore.isLoading && !sideDishStore.isLoading;
});

onMounted(async () => {
    if (recipeStore.recipes.length === 0) await recipeStore.fetchRecipes();
    if (sideDishStore.sideDishes.length === 0) await sideDishStore.fetchSideDishes();
    if (mealStore.meals.length === 0) mealStore.setupRealtimeListener();

    // Default to a 7-day range starting today
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    datesRange.value = [today, nextWeek];
});

// Clear copy success message when date changes
watch(datesRange, () => {
    copySuccess.value = false;
});

interface ShoppingItem {
    id: string; 
    name: string;
    details: string;
    checked: boolean;
}

const shoppingList = computed<ShoppingItem[]>(() => {
    if (!datesRange.value || datesRange.value.length < 2 || !datesRange.value[1]) return [];
    
    const rawStart = datesRange.value[0];
    const rawEnd = datesRange.value[1];
    
    // Safety check just in case
    if (!rawStart || !rawEnd) return [];

    const startObj = new Date(rawStart);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(rawEnd);
    endObj.setHours(23, 59, 59, 999);

    // Filter meals in the range
    const validMeals = mealStore.meals.filter(m => {
        // Type casting to strictly handle both string and Date safely for TS
        const rawDate = m.date;
        const mealDateStr = typeof rawDate === 'string' 
            ? rawDate 
            : (rawDate instanceof Date ? rawDate.toISOString().split('T')[0] : '');
            
        if (!mealDateStr) return false;
        const parts = mealDateStr.split('-');
        if (parts.length < 3) return false;
        
        const year = parseInt(parts[0]!, 10);
        const month = parseInt(parts[1]!, 10);
        const day = parseInt(parts[2]!, 10);
        
        const mealDate = new Date(year, month - 1, day);
        return mealDate >= startObj && mealDate <= endObj;
    });

    const itemsMap = new Map<string, { quantity?: number; unit?: string }[]>();

    for (const meal of validMeals) {
        // 1. Ingredients from recipe
        if (meal.recipeId) {
            const recipe = recipeStore.recipes.find(r => r.id === meal.recipeId);
            if (recipe && recipe.ingredients) {
                for (const ing of recipe.ingredients) {
                    const key = ing.name.trim().toLowerCase();
                    const existing = itemsMap.get(key) || [];
                    existing.push({ quantity: ing.quantity, unit: ing.unit });
                    itemsMap.set(key, existing);
                }
            }
        }
        
        // 2. Accompagnements bruts
        if (meal.selectedSideDishIds) {
            for (const sideId of meal.selectedSideDishIds) {
                const side = sideDishStore.sideDishes.find(s => s.id === sideId);
                if (side) {
                    const key = side.name.trim().toLowerCase();
                    const existing = itemsMap.get(key) || [];
                    existing.push({ quantity: undefined, unit: undefined });
                    itemsMap.set(key, existing);
                }
            }
        }
    }

    // Format map to flat array
    const result: ShoppingItem[] = [];
    itemsMap.forEach((quantities, key) => {
        const formattedName = key.charAt(0).toUpperCase() + key.slice(1);
        
        const unitGroups = new Map<string, number>();
        let hasNoQuantities = false;
        
        quantities.forEach(q => {
            if (q.quantity !== undefined && q.quantity !== null && !isNaN(q.quantity as any) && (q.quantity as any) !== '') {
                const qNum = Number(q.quantity);
                const unitKey = (q.unit || '').trim().toLowerCase();
                const currentSum = unitGroups.get(unitKey) || 0;
                unitGroups.set(unitKey, currentSum + qNum);
            } else {
                hasNoQuantities = true;
            }
        });

        const combinedItems: string[] = [];
        unitGroups.forEach((sum, unitKey) => {
            // Round to avoid 0.30000000000000004
            const roundedSum = Math.round(sum * 100) / 100;
            if (unitKey) {
                combinedItems.push(`${roundedSum} ${unitKey}`);
            } else {
                combinedItems.push(`${roundedSum}`);
            }
        });
        
        if (hasNoQuantities && combinedItems.length > 0) {
            combinedItems.push('+ qté(s) indéterminée(s)');
        }

        result.push({
            id: key,
            name: formattedName,
            details: combinedItems.join(', '),
            checked: false
        });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const copyToClipboard = async () => {
    let copyText = `🛒 Liste de courses du ${datesRange.value[0]?.toLocaleDateString('fr-FR')} au ${datesRange.value[1]?.toLocaleDateString('fr-FR')}\n\n`;
    
    // Only copy items that are NOT checked
    const itemsToCopy = shoppingList.value.filter(i => !i.checked);

    if (itemsToCopy.length === 0) {
        copyText += "(Tous les articles ont été cochés !)";
    } else {
        itemsToCopy.forEach(item => {
            copyText += `- ${item.name}`;
            if (item.details) {
                copyText += ` : ${item.details}`;
            }
            copyText += '\n';
        });
    }

    try {
        await navigator.clipboard.writeText(copyText);
        copySuccess.value = true;
        setTimeout(() => { copySuccess.value = false; }, 3000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
};

</script>

<template>
    <div class="shopping-list-view max-w-3xl mx-auto p-4 animate-fadein pb-8">
        
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 flex items-center gap-3">
                <i class="pi pi-shopping-cart text-primary-500"></i>
                Liste de Courses
            </h1>
            <p class="text-surface-500 mt-2">Générée automatiquement d'après vos recettes planifiées.</p>
        </div>

        <div v-if="!isDataReady" class="flex justify-center p-12">
            <ProgressSpinner strokeWidth="4" />
        </div>

        <div v-else class="flex flex-col gap-6">
            
            <!-- CONTROLS -->
            <div class="bg-surface-0 dark:bg-surface-900 p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div class="flex flex-col gap-2 w-full sm:w-auto">
                    <label class="font-semibold text-sm">Période des courses</label>
                    <DatePicker 
                        v-model="datesRange" 
                        selectionMode="range" 
                        :manualInput="false" 
                        placeholder="Ex: Du 10 au 17 Juin"
                        class="w-full sm:w-72" 
                        dateFormat="dd/mm/yy"
                        showIcon
                    />
                </div>
                
                <div class="w-full sm:w-auto pt-5">
                    <Button 
                        :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'" 
                        :label="copySuccess ? 'Copié !' : 'Copier (Drive/Notes)'" 
                        :severity="copySuccess ? 'success' : 'primary'"
                        @click="copyToClipboard" 
                        class="w-full"
                        :disabled="shoppingList.length === 0"
                    />
                </div>
            </div>

            <!-- MESSAGES ET ETAT -->
            <Message v-if="!datesRange || datesRange.length < 2 || !datesRange[1]" severity="info" :closable="false">
                Veuillez sélectionner une plage de dates complète (Date de début et Date de fin) dans le calendrier.
            </Message>

            <div v-else-if="shoppingList.length === 0" class="text-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                <i class="pi pi-inbox text-4xl text-surface-400 mb-3 block"></i>
                <h3 class="font-semibold text-lg">Aucun ingrédient requis</h3>
                <p class="text-surface-500 mt-1">Aucun repas n'est prévu sur cette période, ou vos recettes ne contiennent aucun ingrédient ni accompagnement.</p>
            </div>

            <!-- LA LISTE -->
            <div v-else class="bg-surface-0 dark:bg-surface-900 p-2 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700">
                <div class="flex flex-col gap-1 mb-4 px-3 border-b border-surface-100 dark:border-surface-800 pb-3">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-lg">Articles à acheter ({{ shoppingList.length - shoppingList.filter(i => i.checked).length }})</span>
                        <span class="text-sm text-surface-500">{{ shoppingList.filter(i => i.checked).length }} possédé(s) / ignoré(s)</span>
                    </div>
                    <p class="text-sm text-surface-500 mt-1">Cochez les éléments que vous avez déjà dans vos placards. Le bouton « Copier » ignorera ces articles.</p>
                </div>

                <div class="flex flex-col gap-1">
                    <div 
                        v-for="item in shoppingList" 
                        :key="item.id"
                        class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                        @click="item.checked = !item.checked"
                    >
                        <Checkbox v-model="item.checked" :binary="true" :inputId="item.id" @click.stop />
                        <label 
                            :for="item.id" 
                            class="flex-1 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between transition-opacity"
                            :class="{'opacity-40 line-through': item.checked}"
                        >
                            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ item.name }}</span>
                            <span v-if="item.details" class="text-sm text-primary-700 dark:text-primary-700 font-medium sm:ml-4 bg-primary-100 dark:bg-primary-900/50 border border-primary-200 dark:border-primary-800 px-2 py-0.5 rounded-md inline-block w-fit mt-1 sm:mt-0">
                                {{ item.details }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.animate-fadein {
    animation: fadein 0.3s ease-out forwards;
}
@keyframes fadein {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
