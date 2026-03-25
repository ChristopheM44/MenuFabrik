<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAllergenStore } from '../../stores/allergenStore';
import type { Allergen } from '../../models/Allergen';
import { useAppConfirm } from '../../composables/useAppConfirm';

const allergenStore = useAllergenStore();
const { confirm } = useAppConfirm();

const sortedAllergens = computed(() => {
    return [...allergenStore.allergens].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const newAllergenName = ref('');
const isAddingAllergen = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref('');

const quickAddAllergen = async () => {
    if (!newAllergenName.value.trim()) return;
    isAddingAllergen.value = true;
    try {
        await allergenStore.addAllergen({ name: newAllergenName.value.trim() });
        newAllergenName.value = '';
    } finally {
        isAddingAllergen.value = false;
    }
};

const startEdit = (allergen: Allergen) => {
    editingId.value = allergen.id!;
    editingName.value = allergen.name;
};

const saveEdit = async (allergen: Allergen) => {
    if (editingName.value.trim() && allergen.id) {
        await allergenStore.updateAllergen(allergen.id, { name: editingName.value.trim() });
    }
    cancelEdit();
};

const cancelEdit = () => {
    editingId.value = null;
    editingName.value = '';
};

const deleteAllergen = (id: string) => {
    confirm({
        title: 'Supprimer cet allergène',
        message: "Supprimer cet allergène ?",
        acceptLabel: 'Oui, supprimer',
        rejectLabel: 'Non',
        onAccept: async () => {
            await allergenStore.deleteAllergen(id);
        }
    });
};
</script>

<template>
  <div>
    <p class="text-on-surface-variant mb-6">Gérez le dictionnaire des allergènes de votre base de données.</p>

    <!-- Quick add pill -->
    <div class="flex items-center bg-surface-container-high dark:bg-surface-700 rounded-full px-6 py-3 mb-8 focus-within:bg-surface-container-lowest dark:focus-within:bg-surface-600 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <input
            v-model="newAllergenName"
            placeholder="Nouvel allergène..."
            @keyup.enter="quickAddAllergen"
            class="bg-transparent border-none focus:ring-0 w-full text-on-surface dark:text-white placeholder:text-outline font-medium outline-none"
        />
        <button
            @click="quickAddAllergen"
            :disabled="!newAllergenName.trim() || isAddingAllergen"
            class="ml-2 bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 active:scale-90 transition-all disabled:opacity-40"
        >
            <span class="material-symbols-outlined text-[1.25rem]">add</span>
        </button>
    </div>

    <!-- Liste -->
    <div class="space-y-3">
        <div
            v-for="allergen in sortedAllergens"
            :key="allergen.id"
            class="group bg-surface-container-lowest dark:bg-surface-800 p-5 rounded-xl flex items-center justify-between transition-all duration-300 hover:translate-x-1 hover:bg-surface-container-low dark:hover:bg-surface-700"
        >
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="w-2 h-2 rounded-full bg-primary/40 shrink-0"></div>
                <span
                    v-if="editingId !== allergen.id"
                    class="font-headline font-semibold text-on-surface text-xl truncate"
                >{{ allergen.name }}</span>
                <input
                    v-else
                    v-model="editingName"
                    @keyup.enter="saveEdit(allergen)"
                    @keyup.escape="cancelEdit"
                    @blur="saveEdit(allergen)"
                    autofocus
                    class="font-headline font-semibold text-on-surface dark:text-white text-xl bg-transparent border-b-2 border-primary focus:outline-none w-full"
                />
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                <button
                    v-if="editingId !== allergen.id"
                    @click="startEdit(allergen)"
                    class="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-full transition-colors"
                    aria-label="Modifier"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">edit</span>
                </button>
                <button
                    v-else
                    @click="saveEdit(allergen)"
                    class="p-2 hover:bg-primary-container/30 rounded-full text-primary transition-colors"
                    aria-label="Enregistrer"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">check</span>
                </button>
                <button
                    @click="deleteAllergen(allergen.id!)"
                    class="p-2 text-outline hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                    aria-label="Supprimer"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">delete</span>
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
