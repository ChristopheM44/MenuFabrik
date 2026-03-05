<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

import { useMealStore } from '../../stores/mealStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSideDishStore } from '../../stores/sideDishStore';
import { useShoppingStore } from '../../stores/shoppingStore';
import { useToast } from 'primevue/usetoast';

const visible = defineModel<boolean>('visible', { default: false });

const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const sideDishStore = useSideDishStore();
const shoppingStore = useShoppingStore();
const toast = useToast();

const datesRange = ref<Date[]>([]);
const isImporting = ref(false);

interface ModalItem {
    id: string;
    name: string;
    details: string;
    selected: boolean; // default true
}

const localItems = ref<ModalItem[]>([]);

const isDataReady = computed(() => {
    return !recipeStore.isLoading && !mealStore.isLoading && !sideDishStore.isLoading;
});

// Init dates on open
watch(visible, (newVal) => {
    if (newVal) {
        if (recipeStore.recipes.length === 0) recipeStore.fetchRecipes();
        if (sideDishStore.sideDishes.length === 0) sideDishStore.fetchSideDishes();
        if (mealStore.meals.length === 0) mealStore.setupRealtimeListener();

        // Default to a 7-day range starting today
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        datesRange.value = [today, nextWeek];
    }
});

watch(datesRange, () => {
    if (!datesRange.value || datesRange.value.length < 2 || !datesRange.value[1]) {
        localItems.value = [];
        return;
    }

    const rawStart = datesRange.value[0];
    const rawEnd = datesRange.value[1];

    if (!rawStart || !rawEnd) return;

    const startObj = new Date(rawStart);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(rawEnd);
    endObj.setHours(23, 59, 59, 999);

    const validMeals = mealStore.meals.filter(m => {
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

    const result: ModalItem[] = [];
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

        const id = 'shop-' + key.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Preserve selection state if already in localItems
        const existingItem = localItems.value.find(i => i.id === id);
        
        result.push({
            id,
            name: formattedName,
            details: combinedItems.join(', '),
            selected: existingItem ? existingItem.selected : true
        });
    });

    localItems.value = result.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}, { deep: true });

const toggleAll = () => {
    const allSelected = localItems.value.every(i => i.selected);
    localItems.value.forEach(i => i.selected = !allSelected);
};

const handleImport = async () => {
    const itemsToImport = localItems.value.filter(i => i.selected);
    if (itemsToImport.length === 0) {
        toast.add({ severity: 'warn', summary: 'Aucun article', detail: 'Veuillez sélectionner au moins un article.', life: 3000 });
        return;
    }

    isImporting.value = true;
    try {
        const addedItems = itemsToImport.map(item => ({
            name: item.name,
            details: item.details,
            checked: false,
            source: 'recipe' as const,
            addedAt: new Date().toISOString()
        }));
        
        await shoppingStore.addItemsBatch(addedItems);
        toast.add({ severity: 'success', summary: 'Import réussi', detail: `${addedItems.length} article(s) ajouté(s) à votre panier.`, life: 3000 });
        visible.value = false;
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 5000 });
    } finally {
        isImporting.value = false;
    }
};

const close = () => {
    visible.value = false;
};
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Importer depuis l'Agenda" :style="{ width: '90vw', maxWidth: '600px' }" :closable="!isImporting">
        <div class="flex flex-col gap-4">
            <p class="text-surface-500 dark:text-surface-400 text-sm">Sélectionnez la période pour générer automatiquement la liste des ingrédients. Décochez ceux que vous avez déjà dans vos placards.</p>
            
            <div class="flex flex-col gap-2">
                <label for="datesRangeImport" class="font-semibold text-sm">Période des courses</label>
                <DatePicker 
                    inputId="datesRangeImport"
                    v-model="datesRange" 
                    selectionMode="range" 
                    :manualInput="false" 
                    placeholder="Ex: Du 10 au 17 Juin"
                    class="w-full" 
                    dateFormat="dd/mm/yy"
                    showIcon
                />
            </div>

            <div v-if="!isDataReady" class="flex justify-center p-6">
                <ProgressSpinner strokeWidth="4" />
            </div>

            <template v-else>
                <Message v-if="!datesRange || datesRange.length < 2 || !datesRange[1]" severity="info" :closable="false">
                    Veuillez sélectionner une plage de dates complète.
                </Message>

                <div v-else-if="localItems.length === 0" class="text-center p-6 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                    <p class="text-surface-500 dark:text-surface-400">Aucun ingrédient requis sur cette période.</p>
                </div>

                <div v-else class="flex flex-col gap-2 mt-2">
                    <div class="flex justify-between items-center bg-surface-100 dark:bg-surface-800 p-2 rounded-lg">
                        <span class="font-semibold text-sm">{{ localItems.filter(i => i.selected).length }} article(s) à importer</span>
                        <Button label="Tout (dé)cocher" text size="small" @click="toggleAll" />
                    </div>

                    <div class="max-h-96 overflow-y-auto pr-2 flex flex-col gap-1">
                        <div 
                            v-for="item in localItems" 
                            :key="item.id"
                            class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                            @click="item.selected = !item.selected"
                        >
                            <Checkbox v-model="item.selected" :binary="true" :inputId="item.id" @click.stop />
                            <label 
                                :for="item.id" 
                                class="flex-1 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between"
                                :class="{'opacity-50 line-through': !item.selected}"
                            >
                                <span class="font-medium text-surface-900 dark:text-surface-0">{{ item.name }}</span>
                                <span v-if="item.details" class="text-xs text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 px-2 py-0.5 rounded">
                                    {{ item.details }}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <template #footer>
            <Button label="Annuler" text severity="secondary" @click="close" :disabled="isImporting" />
            <Button label="Valider et Importer" icon="pi pi-check" @click="handleImport" :loading="isImporting" :disabled="localItems.length === 0" />
        </template>
    </Dialog>
</template>
