<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import DatePicker from 'primevue/datepicker';

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
    selected: boolean;
    recipeNames?: string[];
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

    const itemsMap = new Map<string, { quantity?: number; unit?: string; recipeName?: string }[]>();

    for (const meal of validMeals) {
        let mainRecipeName = '';
        if (meal.recipeId) {
            const recipe = recipeStore.recipes.find(r => r.id === meal.recipeId);
            if (recipe) {
                mainRecipeName = recipe.name;
                if (recipe.ingredients) {
                    for (const ing of recipe.ingredients) {
                        const key = ing.name.trim().toLowerCase();
                        const existing = itemsMap.get(key) || [];
                        existing.push({ quantity: ing.quantity, unit: ing.unit, recipeName: mainRecipeName });
                        itemsMap.set(key, existing);
                    }
                }
            }
        }

        if (meal.selectedSideDishIds) {
            for (const sideId of meal.selectedSideDishIds) {
                const side = sideDishStore.sideDishes.find(s => s.id === sideId);
                if (side) {
                    const key = side.name.trim().toLowerCase();
                    const existing = itemsMap.get(key) || [];
                    const displayRecipeName = mainRecipeName ? mainRecipeName : side.name;
                    existing.push({ quantity: undefined, unit: undefined, recipeName: displayRecipeName });
                    itemsMap.set(key, existing);
                }
            }
        }
    }

    const result: ModalItem[] = [];
    itemsMap.forEach((quantities, key) => {
        const formattedName = key.charAt(0).toUpperCase() + key.slice(1);

        const unitGroups = new Map<string, number>();
        const recipeNamesSet = new Set<string>();
        let hasNoQuantities = false;

        quantities.forEach(q => {
            if (typeof q.quantity === 'number' && !isNaN(q.quantity)) {
                const qNum = Number(q.quantity);
                const unitKey = (q.unit || '').trim().toLowerCase();
                const currentSum = unitGroups.get(unitKey) || 0;
                unitGroups.set(unitKey, currentSum + qNum);
            } else {
                hasNoQuantities = true;
            }
            if (q.recipeName) {
                recipeNamesSet.add(q.recipeName);
            }
        });

        const recipeNames = Array.from(recipeNamesSet);
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
        const existingItem = localItems.value.find(i => i.id === id);

        result.push({
            id,
            name: formattedName,
            details: combinedItems.join(', '),
            selected: existingItem ? existingItem.selected : true,
            recipeNames: recipeNames.length > 0 ? recipeNames : undefined
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
            recipeNames: item.recipeNames,
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
    <Teleport to="body">
        <Transition name="sheet">
            <div v-if="visible" class="fixed inset-0 z-50">
                <!-- Backdrop -->
                <div
                    class="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
                    @click="!isImporting && close()"
                />

                <!-- Bottom Sheet -->
                <div class="absolute inset-x-0 bottom-0 top-0 flex flex-col bg-surface-bright shadow-2xl overflow-hidden rounded-t-[2.5rem] md:top-auto md:max-w-2xl md:mx-auto md:bottom-8 md:rounded-[2.5rem] md:max-h-[90vh]">

                    <!-- Header -->
                    <header class="px-6 pt-8 pb-4 flex flex-col gap-4 shrink-0">
                        <div class="flex items-center justify-between">
                            <h1 class="font-headline font-bold text-2xl tracking-tight text-on-surface">Importer depuis l'Agenda</h1>
                            <button
                                @click="close"
                                :disabled="isImporting"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-50"
                            >
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <p class="text-on-surface-variant leading-relaxed font-medium text-sm">
                            Sélectionnez la période pour générer automatiquement la liste des ingrédients. Décochez ceux que vous avez déjà dans vos placards.
                        </p>
                    </header>

                    <!-- Scrollable content -->
                    <main class="flex-1 overflow-y-auto px-6 pb-48 space-y-8 hide-scrollbar">

                        <!-- Date Range Picker -->
                        <section class="space-y-3">
                            <label class="font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant block ml-1">Période des courses</label>
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none z-10 text-[20px]">calendar_today</span>
                                <DatePicker
                                    inputId="datesRangeImport"
                                    v-model="datesRange"
                                    selectionMode="range"
                                    :manualInput="false"
                                    placeholder="Ex: Du 10 au 17 Juin"
                                    class="w-full"
                                    dateFormat="dd/mm/yy"
                                    inputClass="w-full h-14 rounded-2xl bg-surface-container-low border-none pr-4 font-semibold font-body text-on-surface focus:ring-0"
                                />
                            </div>
                        </section>

                        <!-- Loading -->
                        <div v-if="!isDataReady" class="flex flex-col items-center justify-center py-12 space-y-3">
                            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Chargement...</span>
                        </div>

                        <template v-else>
                            <!-- No range selected -->
                            <div
                                v-if="!datesRange || datesRange.length < 2 || !datesRange[1]"
                                class="flex flex-col items-center justify-center py-12 text-center bg-surface-container-low rounded-[2rem] border-2 border-dashed border-outline-variant/20"
                            >
                                <div class="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
                                    <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">calendar_month</span>
                                </div>
                                <p class="text-sm font-medium text-on-surface-variant">Sélectionnez une plage de dates pour voir les ingrédients.</p>
                            </div>

                            <!-- Empty state -->
                            <div
                                v-else-if="localItems.length === 0"
                                class="flex flex-col items-center justify-center py-12 text-center bg-surface-container-low rounded-[2rem] border-2 border-dashed border-outline-variant/20"
                            >
                                <div class="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
                                    <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">restaurant</span>
                                </div>
                                <h3 class="font-headline font-bold text-on-surface">Aucun ingrédient trouvé</h3>
                                <p class="text-sm text-on-surface-variant px-8 mt-1">Ajoutez des recettes à votre agenda pour voir les ingrédients apparaître ici.</p>
                            </div>

                            <!-- Ingredient cards -->
                            <section v-else class="space-y-4">
                                <div class="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                                    <div class="flex items-center gap-2">
                                        <h2 class="font-headline font-extrabold text-lg text-on-surface">
                                            {{ localItems.filter(i => i.selected).length }} article(s) à importer
                                        </h2>
                                        <span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                                    </div>
                                    <button @click="toggleAll" class="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4">
                                        Tout (dé)cocher
                                    </button>
                                </div>

                                <div class="grid gap-3">
                                    <div
                                        v-for="item in localItems"
                                        :key="item.id"
                                        @click="item.selected = !item.selected"
                                        class="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none"
                                        :class="item.selected
                                            ? 'bg-surface-container-lowest border border-outline-variant/5 shadow-sm'
                                            : 'bg-surface-container-low/50 border border-transparent opacity-60'"
                                    >
                                        <!-- Check indicator -->
                                        <div
                                            class="flex items-center justify-center w-6 h-6 rounded-lg transition-all shrink-0"
                                            :class="item.selected
                                                ? 'bg-primary text-on-primary scale-110'
                                                : 'border-2 border-outline-variant bg-surface-container-lowest'"
                                        >
                                            <span
                                                v-if="item.selected"
                                                class="material-symbols-outlined text-[16px]"
                                                style="font-variation-settings: 'FILL' 0, 'wght' 700;"
                                            >check</span>
                                        </div>

                                        <!-- Content -->
                                        <div class="flex-1 min-w-0">
                                            <span
                                                class="font-bold text-base block transition-colors"
                                                :class="item.selected ? 'text-on-surface' : 'text-on-surface-variant line-through'"
                                            >{{ item.name }}</span>
                                            <div class="flex flex-wrap items-center gap-2 mt-1">
                                                <span
                                                    v-if="item.details"
                                                    class="px-2 py-0.5 rounded-md text-xs font-bold transition-colors"
                                                    :class="item.selected
                                                        ? 'bg-primary-container text-on-primary-container'
                                                        : 'bg-surface-container-highest text-on-surface-variant'"
                                                >{{ item.details }}</span>
                                                <span
                                                    v-if="item.recipeNames && item.recipeNames.length > 0"
                                                    class="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-tighter"
                                                >{{ item.recipeNames.join(', ') }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </template>
                    </main>

                    <!-- Footer -->
                    <footer class="absolute bottom-0 inset-x-0 px-6 pt-4 pb-6 bg-surface-bright flex flex-col gap-3 shrink-0">
                        <div class="absolute -top-12 inset-x-0 h-12 bg-gradient-to-t from-surface-bright to-transparent pointer-events-none"></div>
                        <button
                            @click="handleImport"
                            :disabled="isImporting || localItems.filter(i => i.selected).length === 0"
                            class="w-full py-5 bg-primary text-on-primary rounded-full font-headline font-extrabold text-base shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <div v-if="isImporting" class="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                            <span>{{ isImporting ? 'Importation...' : 'Valider et Importer' }}</span>
                        </button>
                        <div class="w-32 h-1.5 bg-on-surface/10 rounded-full mx-auto mt-1"></div>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

:deep(#datesRangeImport) {
    padding-left: 3rem !important;
}

.sheet-enter-active,
.sheet-leave-active {
    transition: opacity 0.25s ease;
}
.sheet-enter-active .absolute.inset-x-0.bottom-0,
.sheet-leave-active .absolute.inset-x-0.bottom-0 {
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
    opacity: 0;
}
</style>
