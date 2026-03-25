<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { usePantryStore } from '../../stores/pantryStore';
import { useToast } from 'primevue/usetoast';
import { useAppConfirm } from '../../composables/useAppConfirm';
import type { PantryItem } from '../../models/PantryItem';

const pantryStore = usePantryStore();
const toast = useToast();
const { confirm } = useAppConfirm();

const newPantryItemName = ref('');
const editingId = ref<string | null>(null);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

const sortedPantryItems = computed(() => 
    [...pantryStore.pantryItems].sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
);

const selectedCount = computed(() => 
    pantryStore.pantryItems.filter(i => i.selected).length
);

const addPantryItem = async () => {
    const name = newPantryItemName.value.trim();
    if (!name) return;
    try {
        await pantryStore.addPantryItem({ name, selected: false });
        newPantryItemName.value = '';
        toast.add({ severity: 'success', summary: 'Ajouté', detail: 'Basique ajouté à vos placards', life: 2000 });
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};

const toggleSelection = (item: PantryItem) => {
    if (editingId.value) return; // Empêcher toggle si on édite
    if (item.id) {
        pantryStore.updatePantryItem(item.id, { selected: !item.selected });
    }
};

const startEditing = async (item: PantryItem) => {
    if (!item.id) return;
    editingId.value = item.id;
    editingName.value = item.name;
    await nextTick();
    editInputRef.value?.focus();
};

const saveEdit = async () => {
    if (!editingId.value) return;
    const newName = editingName.value.trim();
    if (!newName) {
        cancelEdit();
        return;
    }
    try {
        await pantryStore.updatePantryItem(editingId.value, { name: newName });
        editingId.value = null;
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};

const cancelEdit = () => {
    editingId.value = null;
    editingName.value = '';
};

const transferSelected = async () => {
    try {
        const count = await pantryStore.transferSelectedToShoppingList();
        if (count > 0) {
            toast.add({ 
                severity: 'success', 
                summary: 'Transfert réussi', 
                detail: `${count} article(s) ajouté(s) à votre panier`, 
                life: 3000 
            });
        }
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};

const deleteItem = (item: PantryItem) => {
    confirm({
        title: 'Supprimer du placard',
        message: `Voulez-vous vraiment retirer "${item.name}" de vos basiques ?`,
        acceptLabel: 'Supprimer',
        rejectLabel: 'Annuler',
        onAccept: async () => {
            if (item.id) {
                try {
                    await pantryStore.deletePantryItem(item.id);
                    toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Article retiré du placard', life: 2000 });
                } catch (e: any) {
                    toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
                }
            }
        }
    });
};
</script>

<template>
    <div class="flex flex-col gap-8 pb-24">

        <!-- Action principale : Transfert -->
        <div v-if="selectedCount > 0" class="sticky top-4 z-10">
            <button
                @click="transferSelected"
                class="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-full font-bold font-headline shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
                <span class="material-symbols-outlined">shopping_cart_checkout</span>
                Transférer au Panier ({{ selectedCount }})
            </button>
        </div>

        <!-- Input d'ajout pill -->
        <div class="relative">
            <input
                v-model="newPantryItemName"
                @keyup.enter="addPantryItem"
                class="w-full pl-6 pr-14 py-4 bg-surface-container-high rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 font-medium transition-shadow shadow-sm hover:shadow-md"
                placeholder="Riz, Huile d'olive, Pâtes..." />
            <button
                @click="addPantryItem"
                :disabled="!newPantryItemName.trim()"
                class="absolute right-2 top-2 w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40">
                <span class="material-symbols-outlined">add</span>
            </button>
        </div>

        <!-- État de chargement -->
        <div v-if="pantryStore.isLoading" class="flex justify-center py-12">
            <span class="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        </div>

        <!-- État vide -->
        <div v-else-if="pantryStore.pantryItems.length === 0"
            class="text-center py-16 flex flex-col items-center gap-3">
            <span class="material-symbols-outlined text-5xl text-on-surface-variant/30">inventory_2</span>
            <h3 class="font-headline font-semibold text-lg text-on-surface">Vos placards sont vides</h3>
            <p class="text-on-surface-variant text-sm px-8">Ajoutez vos produits de base récurrents pour les retrouver facilement.</p>
        </div>

        <!-- Liste des articles -->
        <div v-else class="flex flex-col gap-3">
            <div class="flex items-center justify-between mb-1 px-2">
                <h3 class="font-headline font-bold text-on-surface text-sm uppercase tracking-wider opacity-60">
                    Mes Basiques ({{ pantryStore.pantryItems.length }})
                </h3>
            </div>

            <TransitionGroup name="list" tag="div" class="flex flex-col gap-3">
                <div v-for="item in sortedPantryItems" :key="item.id"
                    class="group flex items-center gap-4 bg-surface-container-lowest p-4 rounded-3xl shadow-sm border border-outline-variant/5 cursor-pointer relative"
                    @click="toggleSelection(item)">

                    <!-- Checkbox custom -->
                    <div class="w-6 h-6 rounded-lg border-2 shrink-0 transition-colors flex items-center justify-center"
                        :class="item.selected ? 'bg-primary border-primary' : 'border-primary/30'">
                        <span v-if="item.selected" class="material-symbols-outlined text-on-primary text-xs">check</span>
                    </div>

                    <!-- Nom / Input Edition -->
                    <div class="flex-1 min-w-0">
                        <input
                            v-if="editingId === item.id"
                            ref="editInputRef"
                            v-model="editingName"
                            @blur="saveEdit"
                            @keyup.enter="saveEdit"
                            @keyup.esc="cancelEdit"
                            @click.stop
                            class="w-full bg-surface-container-high rounded-lg px-2 py-1 text-on-surface font-bold outline-none ring-2 ring-primary/30"
                        />
                        <span v-else class="block font-bold text-on-surface truncate"
                            :class="{ 'opacity-100': item.selected, 'opacity-70': !item.selected }">
                            {{ item.name }}
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1">
                        <!-- Edit button -->
                        <button 
                            v-if="editingId !== item.id"
                            @click.stop="startEditing(item)"
                            class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all sm:opacity-0 group-hover:opacity-100">
                            <span class="material-symbols-outlined text-xl">edit</span>
                        </button>

                        <!-- Delete button -->
                        <button 
                            v-if="editingId !== item.id"
                            @click.stop="deleteItem(item)"
                            class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-all sm:opacity-0 group-hover:opacity-100">
                            <span class="material-symbols-outlined text-xl">delete</span>
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>

    </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
    transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(10px);
}
</style>
