<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePantryStore } from '../../stores/pantryStore';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';

const pantryStore = usePantryStore();
const toast = useToast();
const confirm = useConfirm();

const newPantryItemName = ref('');
const editingPantryItemId = ref<string | null>(null);
const editingPantryItemName = ref('');

const pantryList = computed(() => {
    return [...pantryStore.pantryItems].sort((a, b) => {
        // Selected first, then alphabetical
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
});

const addPantryItem = async () => {
    const name = newPantryItemName.value.trim();
    if (!name) return;
    try {
        await pantryStore.addPantryItem({
            name,
            selected: true, // Auto-select when adding because usually we add when we need it
        });
        newPantryItemName.value = '';
        toast.add({ severity: 'success', summary: 'Ajouté', detail: 'Basique ajouté à vos placards', life: 2000 });
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};

const deletePantryItem = async (id: string | undefined) => {
    if (!id) return;
    confirm.require({
        message: "Voulez-vous supprimer ce basique de vos placards ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
            try {
                await pantryStore.deletePantryItem(id);
            } catch (e: any) {
                toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
            }
        }
    });
}

const startRenamePantryItem = (item: any) => {
    editingPantryItemId.value = item.id;
    editingPantryItemName.value = item.name;
};

const cancelRenamePantryItem = () => {
    editingPantryItemId.value = null;
    editingPantryItemName.value = '';
};

const saveRenamePantryItem = async (item: any) => {
    const newName = editingPantryItemName.value.trim();
    if (newName !== "" && newName !== item.name) {
        try {
            await pantryStore.updatePantryItem(item.id, { name: newName });
            toast.add({ severity: 'success', summary: 'Modifié', detail: 'Le basique a été renommé.', life: 2000 });
        } catch (e: any) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
        }
    }
    cancelRenamePantryItem();
}

const togglePantrySelected = (item: any) => {
    if (item.id) {
        pantryStore.updatePantryItem(item.id, { selected: item.selected });
    }
}

const transferPantryToShopping = async () => {
    try {
        const count = await pantryStore.transferSelectedToShoppingList();
        if (count > 0) {
            toast.add({ severity: 'success', summary: 'Transfert réussi', detail: `${count} article(s) transféré(s) dans Mon Panier.`, life: 3000 });
        } else {
            toast.add({ severity: 'info', summary: 'Rien à transférer', detail: "Aucun article sélectionné.", life: 3000 });
        }
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};
</script>

<template>
    <div class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-5">
        <div>
            <h3 class="font-bold text-lg mb-1">Stock de la maison</h3>
            <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">Cochez les produits du quotidien qu'il manque dans vos placards pour les transférer ensuite dans votre panier.</p>

            <form @submit.prevent="addPantryItem" class="flex mb-4">
                <div class="p-inputgroup flex-1">
                    <InputText v-model="newPantryItemName" placeholder="Ajouter un basique (Papier toilette, Huile...)" />
                    <Button type="submit" icon="pi pi-plus" :disabled="!newPantryItemName.trim()" />
                </div>
            </form>
        </div>

        <div v-if="pantryList.length === 0" class="text-center p-6 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
            <p class="text-surface-500 dark:text-surface-400">Aucun basique enregistré. Ajoutez-en un au dessus !</p>
        </div>

        <div v-else class="flex flex-col gap-1">
            <TransitionGroup name="list">
                <div v-for="item in pantryList" :key="item.id"
                    class="flex items-center gap-3 p-2 px-3 rounded-lg transition-colors cursor-pointer group border"
                    :class="{
                        'bg-primary-50 dark:bg-primary-400 hover:bg-primary-100 dark:hover:bg-primary-600 border-primary-100 dark:border-primary-500/30': item.selected,
                        'hover:bg-surface-50 dark:hover:bg-surface-400 border-transparent': !item.selected
                    }" @click="item.selected = !item.selected; togglePantrySelected(item)">
                    
                    <Checkbox v-model="item.selected" :binary="true" :inputId="'pantry-' + item.id"
                        @change="togglePantrySelected(item)" @click.stop
                        v-if="editingPantryItemId !== item.id" />
                        
                    <label :for="'pantry-' + item.id"
                        class="flex-1 cursor-pointer font-medium text-surface-900 dark:text-surface-0"
                        v-if="editingPantryItemId !== item.id">
                        {{ item.name }}
                    </label>

                    <div class="flex-1 flex items-center gap-2" v-if="editingPantryItemId === item.id">
                        <InputText v-model="editingPantryItemName" size="small" autofocus class="w-full"
                            @keyup.enter="saveRenamePantryItem(item)"
                            @keyup.esc="cancelRenamePantryItem()" />
                        <Button icon="pi pi-check" size="small" rounded text severity="success" @click.stop="saveRenamePantryItem(item)" />
                        <Button icon="pi pi-times" size="small" rounded text severity="secondary" @click.stop="cancelRenamePantryItem()" />
                    </div>
                    
                    <div class="flex opacity-80 group-hover:opacity-100 transition-opacity" v-else>
                        <Button icon="pi pi-pen-to-square" text rounded severity="secondary" size="small" 
                            :class="[item.selected ? 'dark:text-white text-surface-900' : 'group-hover:text-surface-900 dark:group-hover:text-white', 'transition-colors']" 
                            @click.stop="startRenamePantryItem(item)" />
                        <Button icon="pi pi-trash" text rounded severity="danger" size="small" 
                            :class="[item.selected ? 'dark:text-white' : 'dark:group-hover:text-white', 'transition-colors']" 
                            @click.stop="deletePantryItem(item.id)" />
                    </div>
                </div>
            </TransitionGroup>
        </div>

        <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-end">
            <Button icon="pi pi-cart-arrow-down"
                :label="`Transférer (${pantryList.filter(i => i.selected).length}) dans Mon Panier`"
                @click="transferPantryToShopping"
                :disabled="pantryList.filter(i => i.selected).length === 0" />
        </div>
    </div>
</template>
