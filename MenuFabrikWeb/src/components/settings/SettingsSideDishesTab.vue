<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSideDishStore } from '../../stores/sideDishStore';
import type { SideDish } from '../../models/SideDish';
import { useAppConfirm } from '../../composables/useAppConfirm';

const sideDishStore = useSideDishStore();
const { confirm } = useAppConfirm();

const sortedSideDishes = computed(() => {
    return [...sideDishStore.sideDishes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const newSideDishName = ref('');
const isAddingSideDish = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref('');

const quickAddSideDish = async () => {
    if (!newSideDishName.value.trim()) return;
    isAddingSideDish.value = true;
    try {
        await sideDishStore.addSideDish({ name: newSideDishName.value.trim() });
        newSideDishName.value = '';
    } finally {
        isAddingSideDish.value = false;
    }
};

const startEdit = (dish: SideDish) => {
    editingId.value = dish.id!;
    editingName.value = dish.name;
};

const saveEdit = async (dish: SideDish) => {
    if (editingName.value.trim() && dish.id) {
        await sideDishStore.updateSideDish(dish.id, { name: editingName.value.trim() });
    }
    cancelEdit();
};

const cancelEdit = () => {
    editingId.value = null;
    editingName.value = '';
};

const deleteSideDish = (id: string) => {
    confirm({
        title: 'Supprimer cet accompagnement',
        message: "Supprimer cet accompagnement ?",
        acceptLabel: 'Oui, supprimer',
        rejectLabel: 'Non',
        onAccept: async () => {
            await sideDishStore.deleteSideDish(id);
        }
    });
};
</script>

<template>
  <div>
    <p class="text-on-surface-variant mb-6">Personnalisez la liste des accompagnements disponibles pour vos plats.</p>

    <!-- Quick add pill -->
    <div class="flex items-center bg-surface-container-high dark:bg-surface-700 rounded-full px-6 py-3 mb-8 focus-within:bg-surface-container-lowest dark:focus-within:bg-surface-600 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <input
            v-model="newSideDishName"
            placeholder="Nouvel accompagnement..."
            @keyup.enter="quickAddSideDish"
            class="bg-transparent border-none focus:ring-0 w-full text-on-surface dark:text-white placeholder:text-outline font-medium outline-none"
        />
        <button
            @click="quickAddSideDish"
            :disabled="!newSideDishName.trim() || isAddingSideDish"
            class="ml-2 bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 active:scale-90 transition-all disabled:opacity-40"
        >
            <span class="material-symbols-outlined text-[1.25rem]">add</span>
        </button>
    </div>

    <!-- Liste -->
    <div class="space-y-3">
        <div
            v-for="dish in sortedSideDishes"
            :key="dish.id"
            class="group bg-surface-container-lowest dark:bg-surface-800 p-5 rounded-xl flex items-center justify-between transition-all hover:bg-surface-container-low dark:hover:bg-surface-700 shadow-sm"
        >
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[1.25rem]">restaurant</span>
                </div>
                <span
                    v-if="editingId !== dish.id"
                    class="font-headline font-semibold text-on-surface text-lg truncate"
                >{{ dish.name }}</span>
                <input
                    v-else
                    v-model="editingName"
                    @keyup.enter="saveEdit(dish)"
                    @keyup.escape="cancelEdit"
                    @blur="saveEdit(dish)"
                    autofocus
                    class="font-headline font-semibold text-on-surface dark:text-white text-lg bg-transparent border-b-2 border-primary focus:outline-none w-full"
                />
            </div>
            <div class="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                <button
                    v-if="editingId !== dish.id"
                    @click="startEdit(dish)"
                    class="p-2 hover:bg-surface-container-high dark:hover:bg-surface-600 rounded-full text-outline hover:text-primary transition-colors"
                    aria-label="Modifier"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">edit</span>
                </button>
                <button
                    v-else
                    @click="saveEdit(dish)"
                    class="p-2 hover:bg-primary-container/30 rounded-full text-primary transition-colors"
                    aria-label="Enregistrer"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">check</span>
                </button>
                <button
                    @click="deleteSideDish(dish.id!)"
                    class="p-2 hover:bg-error-container/20 rounded-full text-error transition-colors"
                    aria-label="Supprimer"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">delete</span>
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
