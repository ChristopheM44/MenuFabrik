<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Meal } from '../models/Meal';
import { MealStatus } from '../models/Meal';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Menu from 'primevue/menu';

const props = defineProps<{
    meal: Meal;
}>();

const emit = defineEmits<{
    (e: 'generate'): void;
    (e: 'choose-recipe'): void;
    (e: 'swap'): void;
    (e: 'click'): void;
    (e: 'delete'): void;
    (e: 'change-status', payload: MealStatus): void;
}>();

const menu = ref();
const toggleMenu = (event: Event) => {
    menu.value.toggle(event);
};

const getStatusIcon = (status: MealStatus) => {
    switch (status) {
        case MealStatus.RESTAURANT: return 'pi pi-compass text-orange-500';
        case MealStatus.ABSENT: return 'pi pi-send text-purple-500';
        case MealStatus.WORK: return 'pi pi-briefcase text-blue-500';
        case MealStatus.LEFTOVERS: return 'pi pi-inbox text-amber-600';
        case MealStatus.SHOPPING: return 'pi pi-shopping-cart text-teal-500';
        case MealStatus.SKIPPED: return 'pi pi-times-circle text-gray-500';
        default: return 'pi pi-calendar text-primary-500';
    }
};

const statusMenuItems = computed(() => {
    return Object.values(MealStatus).map(status => ({
        label: status,
        icon: getStatusIcon(status),
        command: () => {
            emit('change-status', status);
        }
    }));
});

const isPlanned = computed(() => props.meal.status === MealStatus.PLANNED);
const hasRecipe = computed(() => !!props.meal.recipe);
const categoryColorClass = computed(() => {
    if (!hasRecipe.value) return 'border-surface-200 dark:border-surface-700';
    const cat = props.meal.recipe?.category;
    if (cat === 'Viandes') return 'border-red-500/50';
    if (cat === 'Poissons') return 'border-cyan-500/50';
    if (cat === 'Végétarien') return 'border-green-500/50';
    return 'border-surface-300 dark:border-surface-600';
});
</script>

<template>
    <div 
        class="meal-card flex flex-col gap-2 p-3 rounded-xl border transition-all overflow-hidden relative"
        :class="[categoryColorClass, {'pb-2': hasRecipe}]"
        :style="hasRecipe ? 'background-color: var(--p-surface-0); dark:background-color: var(--p-surface-900);' : 'background-color: transparent;'"
    >
        <!-- Barre de couleur type de repas pour égayer le design -->
        <div class="absolute left-0 top-0 bottom-0 w-1.5" :class="categoryColorClass" v-if="hasRecipe"></div>
        
        <!-- Wrapper du contenu principal -->
        <div class="flex-1 flex flex-col gap-2" :class="{'pl-3': hasRecipe}">
            <!-- Header: Type et statut et boutons d'action -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-surface-900 dark:text-surface-0 tracking-tight">{{ meal.type }}</span>
                    <Badge v-if="meal.status !== MealStatus.PLANNED" :value="meal.status" severity="info" class="text-xs"></Badge>
                    
                    <!-- Actions (Refresh / Corbeille) placés à côté de Midi/Soir -->
                    <div class="flex items-center ml-1">
                        <!-- Permuter: Visible sur les repas générés (hasRecipe) ou sur les status spéciaux (pas en mode skeleton vide) -->
                        <Button v-if="(hasRecipe && isPlanned) || (!isPlanned)" icon="pi pi-sync" text rounded severity="secondary" size="small" style="width: 2rem; height: 2rem; padding: 0;" @click.stop="emit('swap')" aria-label="Permuter" title="Permuter avec l'autre repas de la journée" />
                        <Button v-if="hasRecipe && isPlanned" icon="pi pi-refresh" text rounded severity="secondary" size="small" style="width: 2rem; height: 2rem; padding: 0;" @click.stop="emit('generate')" aria-label="Alternative" title="Proposer une alternative" />
                        <!-- Options Status -->
                        <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" size="small" style="width: 2rem; height: 2rem; padding: 0;" @click.stop="toggleMenu" aria-label="Options" title="Options du repas" />
                        <Menu ref="menu" :model="statusMenuItems" :popup="true" />
                        <!-- La corbeille est toujours affichée, même sur un repas vide -->
                        <Button icon="pi pi-trash" text rounded severity="danger" size="small" style="width: 2rem; height: 2rem; padding: 0;" @click.stop="emit('delete')" aria-label="Supprimer" title="Supprimer ce repas" />
                    </div>
                </div>
                
                <!-- Participants (Avatars) -->
                <AvatarGroup v-if="meal.attendees && meal.attendees.length > 0">
                    <Avatar 
                        v-for="p in meal.attendees.slice(0, 3)" 
                        :key="p.id" 
                        :label="p.name.charAt(0).toUpperCase()" 
                        shape="circle" 
                        size="small"
                        class="bg-primary-100 text-primary-900 font-bold text-xs"
                    />
                    <Avatar 
                        v-if="meal.attendees.length > 3" 
                        :label="`+${meal.attendees.length - 3}`" 
                        shape="circle" 
                        size="small"
                        class="bg-surface-100 text-surface-600 font-bold text-xs"
                    />
                </AvatarGroup>
            </div>

            <!-- Body: Recette ou Placeholder -->
            <div v-if="hasRecipe && isPlanned" class="flex flex-col gap-1 mt-1 cursor-pointer group" @click="emit('click')" title="Voir les détails">
                <h3 class="text-base font-semibold group-hover:text-primary-600 text-surface-900 dark:text-surface-0 leading-tight transition-colors">
                    {{ meal.recipe?.name }}
                </h3>
                <div class="flex items-center gap-3 text-sm text-surface-500 dark:text-surface-400 mt-1">
                    <span class="flex items-center gap-1"><i class="pi pi-clock text-xs"></i> {{ meal.recipe?.prepTime }} min</span>
                    <span class="flex items-center gap-1" v-if="meal.recipe?.category"><i class="pi pi-tag text-xs"></i> {{ meal.recipe?.category }}</span>
                </div>
                
                <!-- Sides (Accompagnements) -->
                <div v-if="meal.selectedSideDishes && meal.selectedSideDishes.length > 0" class="flex flex-wrap gap-2 mt-2">
                    <Badge 
                        v-for="side in meal.selectedSideDishes" 
                        :key="side.id" 
                        :value="side.name" 
                        severity="success" 
                        class="px-2 font-medium"
                    />
                </div>
            </div>
            
            <!-- Empty state (Prêt à générer) -->
            <div v-else-if="isPlanned" class="flex items-stretch gap-2 mt-1">
                <!-- Action Générer (majoritaire) -->
                <div class="flex-1 flex justify-center items-center p-2 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50/50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer" @click.stop="emit('generate')">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-sparkles text-surface-400 dark:text-surface-500 text-lg"></i>
                        <span class="text-sm font-medium text-surface-500 dark:text-surface-400">Générer</span>
                    </div>
                </div>
                <!-- Action Choisir manuellement -->
                <div class="flex items-center justify-center p-2 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50/50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer" @click.stop="emit('choose-recipe')" title="Choisir une recette manuellement">
                    <i class="pi pi-search text-surface-400 dark:text-surface-500 text-lg"></i>
                </div>
            </div>

            <!-- Other Status (Restaurant, Absent, etc) -->
            <div v-if="!isPlanned" class="flex flex-col items-center justify-center p-3 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50/50 dark:bg-surface-800/50 mt-1">
                <div class="flex items-center gap-3">
                    <i :class="getStatusIcon(meal.status)" class="text-2xl"></i>
                    <span class="text-lg font-medium text-surface-700 dark:text-surface-300">{{ meal.status }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.meal-card {
    background-color: var(--p-surface-0);
}
.dark .meal-card {
    background-color: var(--p-surface-900);
}

.meal-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
