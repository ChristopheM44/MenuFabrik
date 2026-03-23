<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Meal } from '../models/Meal';
import { MealStatus } from '../models/Meal';
import Menu from 'primevue/menu';
import InputText from 'primevue/inputtext';
import { watch } from 'vue';

const props = defineProps<{
    meal: Meal;
    isFirst?: boolean;
    isLast?: boolean;
}>();

const emit = defineEmits<{
    (e: 'generate'): void;
    (e: 'choose-recipe'): void;
    (e: 'swap'): void;
    (e: 'click'): void;
    (e: 'delete'): void;
    (e: 'change-status', payload: MealStatus): void;
    (e: 'edit-attendees'): void;
    (e: 'update-note', payload: string): void;
    (e: 'move-up'): void;
    (e: 'move-down'): void;
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
        case MealStatus.SKIPPED: return 'pi pi-times-circle text-surface-500';
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
// Removed categoryColorClass as we use borders now

// --- Gestion des Notes ---
const localNote = ref(props.meal.noteText || '');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const onNoteChange = (val: string) => {
    localNote.value = val;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        emit('update-note', localNote.value);
    }, 500);
};

watch(() => props.meal.noteText, (newVal) => {
    if (newVal !== localNote.value) {
        localNote.value = newVal || '';
    }
});
</script>

<template>
    <!-- Note Card -->
    <div v-if="meal.format === 'note'" class="bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl p-4 flex items-start gap-4 group/note transition-colors hover:bg-surface-container-low">
        <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
            <i class="pi pi-file-edit text-lg"></i>
        </div>
        <div class="flex-grow pt-1">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold tracking-widest uppercase text-primary">Note</span>
            </div>
            <InputText :id="'note-' + meal.id" :name="'note-' + meal.id" v-model="localNote"
                @input="onNoteChange(($event.target as HTMLInputElement).value)"
                placeholder="Une idée, un reste, une note..."
                class="w-full border-none bg-transparent shadow-none p-0 text-on-surface focus:ring-0 italic text-sm font-medium" />
        </div>
        
        <!-- Hover actions for Note -->
        <div class="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/note:opacity-100 transition-opacity">
            <div class="flex flex-col">
                <button v-if="!isFirst" @click.stop="emit('move-up')" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" title="Monter"><i class="pi pi-chevron-up text-xs"></i></button>
                <button v-if="!isLast" @click.stop="emit('move-down')" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" title="Descendre"><i class="pi pi-chevron-down text-xs"></i></button>
            </div>
            <button @click.stop="emit('delete')" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors" title="Supprimer la note">
                <i class="pi pi-times"></i>
            </button>
        </div>
    </div>

    <!-- Empty State / Dropzone -->
    <div v-else-if="!hasRecipe && isPlanned" class="border-2 border-dashed border-outline-variant rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center bg-surface-container-low/50 hover:bg-surface-container transition-colors cursor-pointer group/drop" @click="emit('choose-recipe')">
        <div class="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-3 group-hover/drop:scale-110 group-hover/drop:bg-primary-container group-hover/drop:text-primary transition-all" title="Choisir manuellement">
            <i class="pi pi-plus text-xl"></i>
        </div>
        <p class="text-base font-bold text-on-surface mb-4 text-center">Un repas en attente d'inspiration...</p>
        
        <div class="flex flex-wrap justify-center gap-3">
            <button @click.stop="emit('generate')" class="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold tracking-wider uppercase flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                <i class="pi pi-sparkles text-sm"></i> Auto-Générer
            </button>
            <button @click.stop="toggleMenu" class="px-4 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold tracking-wider uppercase flex items-center hover:bg-surface-container-highest transition-all" title="Status du repas">
                <i class="pi pi-ellipsis-v"></i>
            </button>
            <Menu ref="menu" :model="statusMenuItems" :popup="true" />
        </div>
        
        <!-- Little trash icon for empty state on hover -->
        <button @click.stop="emit('delete')" class="absolute top-4 right-4 opacity-0 group-hover/drop:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors">
             <i class="pi pi-trash"></i>
        </button>
    </div>

    <!-- Normal Meal Card or Other Status -->
    <div v-else class="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:gap-5 items-start md:items-center shadow-sm hover:shadow-md transition-all relative group/card" :class="{ 'border-l-4 border-primary': !isPlanned, 'border border-outline-variant': isPlanned }">
        
        <!-- Conteneur Image + Info (Côte à côte sur mobile et desktop) -->
        <div class="flex items-center gap-3 md:gap-5 flex-grow min-w-0 w-full cursor-pointer" @click="emit('click')">
            
            <!-- Thumbnail (if recipe) -->
            <div v-if="meal.recipe" class="w-16 h-16 md:w-24 md:h-24 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 relative">
                <img v-if="meal.recipe?.imageUrl" :src="meal.recipe.imageUrl" class="w-full h-full object-cover" loading="lazy" />
                <div v-else class="w-full h-full flex items-center justify-center text-on-surface-variant bg-surface-container-low">
                    <i class="pi pi-image text-xl md:text-2xl"></i>
                </div>
                
                <div v-if="meal.selectedSideDishes && meal.selectedSideDishes.length > 0" class="absolute bottom-1 right-1 bg-surface-900/70 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    +{{meal.selectedSideDishes.length}}
                </div>
            </div>
            <!-- Status Icon (if no recipe but has a status like 'Restaurant') -->
            <div v-else-if="!isPlanned" class="w-16 h-16 rounded-xl flex items-center justify-center bg-surface-container flex-shrink-0">
                 <i :class="getStatusIcon(meal.status)" class="text-xl md:text-2xl"></i>
            </div>

            <!-- Info -->
            <div class="flex-grow min-w-0 py-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-surface-container text-on-surface rounded-full">{{ meal.type }}</span>
                    <span v-if="!isPlanned" class="text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full flex items-center gap-1">
                        <i :class="getStatusIcon(meal.status)" class="text-[9px] md:text-[10px]"></i> {{ meal.status }}
                    </span>
                    <span v-else class="text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-primary-container text-on-primary-container rounded-full">Plannifié</span>
                </div>
                
                <h3 class="text-base md:text-xl font-bold line-clamp-2 md:truncate text-on-surface mb-1 md:mb-2 group-hover/card:text-primary transition-colors" :class="{ 'line-through text-on-surface-variant': !isPlanned }">
                    {{ meal.recipe?.name || (isPlanned ? 'Repas vide' : 'Non plannifié') }}
                </h3>
                
                <div class="flex flex-wrap items-center gap-2 md:gap-4 text-on-surface-variant text-xs font-semibold">
                    <span class="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors bg-surface-container md:bg-transparent px-1.5 py-0.5 md:p-0 rounded" @click.stop="emit('edit-attendees')" title="Modifier participants">
                        <i class="pi pi-users text-sm"></i> 
                        {{ meal.attendees?.length || 0 }} p.
                    </span>
                    <span v-if="meal.recipe?.prepTime" class="flex items-center gap-1">
                        <i class="pi pi-clock text-sm"></i> {{ meal.recipe.prepTime }} min
                    </span>
                    <span v-if="meal.recipe?.category" class="flex items-center gap-1">
                        <i class="pi pi-tag text-sm"></i> <span class="truncate max-w-[80px] md:max-w-none">{{ meal.recipe.category }}</span>
                    </span>
                </div>
                
                <!-- Sides (Accompagnements) -->
                <div v-if="meal.selectedSideDishes && meal.selectedSideDishes.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                    <span v-for="side in meal.selectedSideDishes" :key="side.id" class="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-800/40">
                        <i class="pi pi-check-circle mr-1 text-[9px]"></i>{{ side.name }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Hover Actions -->
        <div class="flex items-center justify-end gap-2 md:gap-1 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-outline-variant md:border-none md:opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            <button v-if="isPlanned" @click.stop="emit('generate')" class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary-container transition-colors border border-outline-variant md:border-none bg-surface-container-low md:bg-transparent" title="Générer alternative">
                <i class="pi pi-sparkles"></i>
            </button>
            <button v-if="isPlanned" @click.stop="emit('swap')" class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors border border-outline-variant md:border-none bg-surface-container-low md:bg-transparent" title="Permuter">
                <i class="pi pi-sync"></i>
            </button>
            <button @click.stop="toggleMenu" class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors border border-outline-variant md:border-none bg-surface-container-low md:bg-transparent" title="Options">
                <i class="pi pi-ellipsis-v"></i>
            </button>
            <Menu ref="menu" :model="statusMenuItems" :popup="true" />
            
            <button @click.stop="emit('delete')" class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-red-100 md:border-none bg-red-50 md:bg-transparent ml-auto md:ml-0" title="Supprimer">
                <i class="pi pi-trash"></i>
            </button>
            
            <!-- Move buttons only visible on desktop -->
            <div class="hidden lg:flex flex-col ml-1">
                 <button v-if="!isFirst" @click.stop="emit('move-up')" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" title="Monter"><i class="pi pi-chevron-up text-[10px]"></i></button>
                 <button v-if="!isLast" @click.stop="emit('move-down')" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" title="Descendre"><i class="pi pi-chevron-down text-[10px]"></i></button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.meal-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
