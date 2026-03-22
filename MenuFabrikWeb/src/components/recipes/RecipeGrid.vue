<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import type { Recipe } from '../../models/Recipe';
import { MealType } from '../../models/Recipe';

const props = defineProps<{
    recipes: Recipe[];
    loading?: boolean;
    mode: 'catalog' | 'picker';
    selectedRecipeId?: string;
    gridCols?: string;
}>();

const emit = defineEmits<{
    (e: 'select', recipe: Recipe): void;
    (e: 'edit', recipe: Recipe): void;
    (e: 'delete', recipe: Recipe): void;
    (e: 'share', recipe: Recipe): void;
}>();

const gridClass = computed(() =>
    props.gridCols ?? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
);

const formatTime = (minutes: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
};

const getMealTypeColor = (type: MealType) => {
    switch (type) {
        case MealType.LUNCH: return 'text-blue-500';
        case MealType.DINNER: return 'text-purple-500';
        case MealType.BOTH: return 'text-green-500';
        default: return 'text-surface-500 dark:text-surface-400';
    }
};

const getMealTypeLabel = (type: MealType) => {
    switch (type) {
        case MealType.LUNCH: return 'Midi';
        case MealType.DINNER: return 'Soir';
        case MealType.BOTH: return 'Midi & Soir';
        default: return type;
    }
};

const handleCardClick = (recipe: Recipe) => {
    if (props.mode === 'picker') {
        emit('select', recipe);
    }
};
</script>

<template>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center p-12">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
    </div>

    <!-- Empty State -->
    <div v-else-if="recipes.length === 0" class="text-center p-12 text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-[#191a1f] rounded-3xl border border-dashed border-surface-200 dark:border-[#2b2d31]">
        <i class="pi pi-inbox text-5xl mb-4 text-surface-300 dark:text-surface-600"></i>
        <p class="text-lg font-medium">Aucune recette ne correspond à cette recherche.</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid gap-4 md:gap-5" :class="gridClass">
        <div 
            v-for="recipe in recipes" 
            :key="recipe.id"
            class="group bg-surface-0 dark:bg-[#202126] rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl flex flex-row items-stretch h-32 md:h-36 border border-surface-200 dark:border-[#2b2d31]"
            :class="{
                'cursor-pointer ring-2 ring-primary-500 border-primary-500': mode === 'picker' && selectedRecipeId === recipe.id,
                'cursor-pointer hover:ring-2 hover:ring-primary-500/40': mode === 'picker' && selectedRecipeId !== recipe.id
            }"
            @click="handleCardClick(recipe)"
        >
            <!-- Image Section -->
            <div 
                class="relative w-32 md:w-36 flex-shrink-0 overflow-hidden bg-surface-100 dark:bg-[#191a1f] flex items-center justify-center border-r border-surface-100 dark:border-[#2b2d31]"
                :class="{ 'cursor-pointer': mode === 'catalog' }"
                @click.stop="mode === 'catalog' && emit('edit', recipe)"
            >
                <img v-if="recipe.imageUrl" :src="recipe.imageUrl" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Recette" loading="lazy" />
                <i v-else class="pi pi-image text-4xl text-surface-300 dark:text-surface-600 transition-transform duration-500 group-hover:scale-110"></i>

                <!-- Category badge -->
                <div class="absolute top-2 left-2 bg-surface-0/90 dark:bg-[#191a1f]/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm">
                    <span class="text-[9px] font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">{{ recipe.category || 'Recette' }}</span>
                </div>

                <!-- Picker: selected indicator on the image -->
                <div v-if="mode === 'picker' && selectedRecipeId === recipe.id" class="absolute inset-0 bg-primary-500/20 flex items-end justify-end p-2">
                    <span class="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                        <i class="pi pi-check text-white text-[11px]"></i>
                    </span>
                </div>
            </div>

            <!-- Card Content -->
            <div class="p-3 md:p-4 flex flex-col flex-1 min-w-0 justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-1.5 text-surface-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                        <span class="flex items-center gap-1">
                            <i class="pi pi-clock text-[11px]"></i>
                            {{ formatTime(recipe.prepTime) }}
                        </span>
                        <span v-if="recipe.rating && recipe.rating > 0" class="flex items-center gap-1 text-primary-500 dark:text-primary-400">
                            <span class="text-surface-300 dark:text-surface-600">•</span>
                            <i class="pi pi-star-fill text-[11px]"></i>
                            {{ recipe.rating }}
                        </span>
                    </div>
                    <h3 class="font-bold text-surface-900 dark:text-surface-0 text-[14px] md:text-[15px] leading-tight line-clamp-2">{{ recipe.name }}</h3>
                </div>

                <div class="flex items-center justify-between mt-2 pt-2 border-t border-surface-100 dark:border-surface-800/50 border-dashed">
                    <span class="text-[9px] font-bold tracking-widest uppercase transition-colors" :class="getMealTypeColor(recipe.mealType)">
                        {{ getMealTypeLabel(recipe.mealType) }}
                    </span>

                    <!-- Catalog mode: action buttons -->
                    <div v-if="mode === 'catalog'" class="flex items-center gap-1 -mr-1">
                        <Button icon="pi pi-share-alt" text rounded severity="secondary" class="w-8 h-8 p-0" @click.stop="emit('share', recipe)" v-tooltip.top="'Partager'" />
                        <Button icon="pi pi-pencil" text rounded severity="secondary" class="w-8 h-8 p-0" @click.stop="emit('edit', recipe)" v-tooltip.top="'Modifier'" />
                        <Button icon="pi pi-trash" text rounded severity="danger" class="w-8 h-8 p-0" @click.stop="emit('delete', recipe)" v-tooltip.top="'Supprimer'" />
                    </div>

                    <!-- Picker mode: select indicator -->
                    <div v-else class="flex items-center gap-1">
                        <i v-if="selectedRecipeId === recipe.id" class="pi pi-check-circle text-primary-500 text-base"></i>
                        <i v-else class="pi pi-chevron-right text-surface-400 dark:text-surface-500 text-base"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
