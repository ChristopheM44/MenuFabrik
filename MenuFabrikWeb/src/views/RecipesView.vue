<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRecipeStore } from '../stores/recipeStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Rating from 'primevue/rating';
import { MealType } from '../models/Recipe';
import { RecipeShareService } from '../services/RecipeShareService';
import { useToast } from 'primevue/usetoast';

const recipeStore = useRecipeStore();
const searchQuery = ref('');
const toast = useToast();

onMounted(async () => {
    // Dans le monde réel, on ajouterait une vérification côté store 
    // pour ne pas refetcher si déjà chargé, mais pour l'instant:
    if (recipeStore.recipes.length === 0) {
        await recipeStore.fetchRecipes();
    }
});

const filteredRecipes = computed(() => {
    let result = recipeStore.recipes;
    if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase();
        result = result.filter(r => 
            r.name.toLowerCase().includes(lowerQuery) || 
            r.category.toLowerCase().includes(lowerQuery)
        );
    }
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
});

const getSeverityForMealType = (type: MealType) => {
    switch (type) {
        case MealType.LUNCH: return 'info';
        case MealType.DINNER: return 'contrast';
        case MealType.BOTH: return 'success';
        default: return 'secondary';
    }
};

const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
};

const shareRecipe = async (recipe: any) => {
    const result = await RecipeShareService.shareOrCopy(recipe);
    if (result.copied) {
        toast.add({ severity: 'success', summary: 'Lien copié', detail: 'Le lien de partage a été copié dans le presse-papier.', life: 3000 });
    }
};
</script>

<template>
    <div class="recipes-view w-full max-w-5xl mx-auto p-4 animate-fadein pb-8">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 border-l-4 pl-3 border-primary-500">Carnet de Recettes</h1>
                <p class="text-surface-500 mt-1 pl-3">{{ recipeStore.recipes.length }} recettes disponibles</p>
            </div>
            
            <div class="flex w-full md:w-auto gap-3">
                <span class="relative w-full md:w-64">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"></i>
                    <InputText v-model="searchQuery" placeholder="Rechercher une recette..." class="w-full" style="padding-left: 2.5rem;" />
                </span>
                <Button icon="pi pi-plus" label="Nouvelle" severity="primary" class="shrink-0" @click="$router.push('/recipes/new')" />
            </div>
        </div>

        <div class="card p-0 md:p-4 rounded-xl md:shadow-sm md:bg-surface-0 dark:md:bg-surface-900">
            <DataTable 
                :value="filteredRecipes" 
                :loading="recipeStore.isLoading"
                stripedRows 
                paginator 
                :rows="10" 
                :rowsPerPageOptions="[5, 10, 20, 50]"
                class="p-datatable-sm md:p-datatable-lg border-none"
            >
                <template #empty>
                    <div class="text-center p-8 text-surface-500">
                        <i class="pi pi-inbox text-4xl mb-4 text-surface-300"></i>
                        <p v-if="recipeStore.isLoading">Chargement des recettes...</p>
                        <p v-else-if="searchQuery">Aucune recette ne correspond à votre recherche.</p>
                        <p v-else>Aucune recette dans votre carnet. Ajoutez-en une !</p>
                    </div>
                </template>

                <Column field="name" header="Nom" :sortable="true" class="w-full sm:w-auto">
                    <template #body="{ data }">
                        <div class="flex flex-col gap-1">
                            <span class="font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                                {{ data.name }}
                            </span>
                            <!-- Infos compactes sur mobile -->
                            <div class="flex sm:hidden items-center gap-2 text-xs text-surface-500">
                                <span v-if="data.rating" class="flex items-center gap-1 text-primary-500">
                                    <i class="pi pi-star-fill"></i> {{ data.rating }}
                                </span>
                                <span><i class="pi pi-clock text-[10px]"></i> {{ formatTime(data.prepTime) }}</span>
                                <span>•</span>
                                <span>{{ data.category }}</span>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column field="rating" header="Note" :sortable="true" class="hidden sm:table-cell text-center">
                    <template #body="{ data }">
                        <Rating v-if="data.rating > 0" :modelValue="data.rating" readonly :cancel="false" />
                        <span v-else class="text-surface-300 italic text-sm">-</span>
                    </template>
                </Column>

                <Column field="category" header="Catégorie" :sortable="true" class="hidden sm:table-cell">
                    <template #body="{ data }">
                        <Tag :value="data.category" severity="secondary" rounded></Tag>
                    </template>
                </Column>

                <Column field="prepTime" header="Temps" :sortable="true" class="hidden sm:table-cell">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2 text-surface-600">
                            <i class="pi pi-clock"></i>
                            <span>{{ formatTime(data.prepTime) }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="mealType" header="Type" :sortable="true" class="hidden md:table-cell">
                    <template #body="{ data }">
                        <Tag :value="data.mealType" :severity="getSeverityForMealType(data.mealType)"></Tag>
                    </template>
                </Column>

                <Column :exportable="false" bodyStyle="white-space: nowrap; text-align: right;">
                    <template #body="{ data }">
                        <div class="flex gap-2 justify-end">
                            <Button icon="pi pi-share-alt" outlined rounded severity="info" aria-label="Partager" v-tooltip.top="'Partager'" @click="shareRecipe(data)" />
                            <Button icon="pi pi-pencil" outlined rounded severity="secondary" aria-label="Éditer" v-tooltip.top="'Modifier'" @click="$router.push(`/recipes/${data.id}`)" />
                            <Button icon="pi pi-trash" outlined rounded severity="danger" aria-label="Supprimer" v-tooltip.top="'Supprimer'" @click="recipeStore.deleteRecipe(data.id)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
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

/* Optimisation Mobile: cacher bordures de datatable sur petits écrans */
:deep(.p-datatable .p-datatable-thead > tr > th) {
    background: transparent;
}
</style>
