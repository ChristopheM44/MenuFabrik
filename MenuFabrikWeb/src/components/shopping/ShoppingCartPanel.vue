<script setup lang="ts">
import { ref, computed } from 'vue';
import { useShoppingStore } from '../../stores/shoppingStore';
import type { ShoppingItem } from '../../models/ShoppingItem';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';

const emit = defineEmits(['importMeals', 'sendToDrive']);
const shoppingStore = useShoppingStore();
const toast = useToast();
const confirm = useConfirm();

const newShoppingItemName = ref('');
const copySuccess = ref(false);

const shoppingList = computed(() => {
    return [...shoppingStore.shoppingItems].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
});

const addManualShoppingItem = async () => {
    const name = newShoppingItemName.value.trim();
    if (!name) return;
    try {
        await shoppingStore.addShoppingItem({
            name,
            checked: false,
            source: 'manual',
            addedAt: new Date().toISOString()
        });
        newShoppingItemName.value = '';
    } catch (e: any) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
    }
};

const deleteCheckedShoppingItems = async () => {
    confirm.require({
        message: "Voulez-vous vraiment supprimer tous les articles cochés de votre panier ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
            try {
                await shoppingStore.clearCheckedItems();
                toast.add({ severity: 'success', summary: 'Nettoyage terminé', detail: 'Les articles terminés ont été supprimés.', life: 3000 });
            } catch (e: any) {
                toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
            }
        }
    });
};

const resetShoppingList = async () => {
    confirm.require({
        message: "Voulez-vous vraiment réinitialiser toute votre liste de courses ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
            try {
                await shoppingStore.clearAllItems();
                toast.add({ severity: 'success', summary: 'Liste réinitialisée', detail: 'Votre panier a été complètement vidé.', life: 3000 });
            } catch (e: any) {
                toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
            }
        }
    });
};

const toggleShoppingCheck = (item: ShoppingItem) => {
    if (item.id) {
        shoppingStore.updateShoppingItem(item.id, { checked: item.checked });
    }
}

const updateShoppingQuantity = (item: ShoppingItem, newQuantity: number | null) => {
    if (item.id && newQuantity !== null) {
        shoppingStore.updateShoppingItem(item.id, { customQuantity: newQuantity });
    }
}

const copyToClipboard = async () => {
    const itemsToCopy = shoppingStore.shoppingItems.filter(i => !i.checked);

    let plainText = `🛒 Liste de courses\n\n`;
    let htmlText = `<h2>🛒 Liste de courses</h2><ul>`;

    if (itemsToCopy.length === 0) {
        const emptyMsg = "(Tous les articles ont été cochés !)";
        plainText += emptyMsg;
        htmlText += `<li><em>${emptyMsg}</em></li>`;
    } else {
        itemsToCopy.forEach(item => {
            const itemLine = `${item.name}${item.details ? ` : ${item.details}` : ''}`;
            plainText += `- ${itemLine}\n`;
            htmlText += `<li>${itemLine}</li>`;
        });
    }
    htmlText += '</ul>';

    try {
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const blobHtml = new Blob([htmlText], { type: 'text/html' });

        await navigator.clipboard.write([
            new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })
        ]);

        copySuccess.value = true;
        setTimeout(() => { copySuccess.value = false; }, 3000);
    } catch (err) {
        try {
            await navigator.clipboard.writeText(plainText);
            copySuccess.value = true;
            setTimeout(() => { copySuccess.value = false; }, 3000);
        } catch (err2) {
            console.error('Final fallback failed: ', err2);
        }
    }
};

</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- HEADER ACTIONS -->
        <div class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-4">
            <div class="flex flex-col md:flex-row gap-4 justify-between w-full">
                <Button icon="pi pi-sparkles" label="D'après mes Menus" @click="$emit('importMeals')" class="w-full md:w-auto p-button-outlined" />

                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'"
                        :label="copySuccess ? 'Copié !' : 'Copier liste'"
                        :severity="copySuccess ? 'success' : 'secondary'" @click="copyToClipboard"
                        class="w-full sm:w-auto" :disabled="shoppingList.length === 0" />
                    <Button icon="pi pi-refresh" label="Réinitialiser" severity="danger" outlined
                        @click="resetShoppingList" class="w-full sm:w-auto" :disabled="shoppingList.length === 0" />
                    <Button icon="pi pi-send" label="Drive" severity="primary" @click="$emit('sendToDrive')"
                        class="w-full sm:w-auto" :disabled="shoppingList.length === 0" />
                </div>
            </div>

            <form @submit.prevent="addManualShoppingItem" class="flex mt-2">
                <div class="p-inputgroup flex-1">
                    <InputText v-model="newShoppingItemName" placeholder="Ajouter un article, un extra..." />
                    <Button type="submit" icon="pi pi-plus" :disabled="!newShoppingItemName.trim()" />
                </div>
            </form>
        </div>

        <!-- LA LISTE -->
        <div v-if="shoppingList.length === 0"
            class="text-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
            <i class="pi pi-inbox text-4xl text-surface-400 dark:text-surface-500 mb-3 block"></i>
            <h3 class="font-semibold text-lg">Votre panier est vide</h3>
            <p class="text-surface-500 dark:text-surface-400 mt-1">Importez vos ingrédients de la semaine ou ajoutez des articles manuellement.</p>
        </div>

        <div v-else class="bg-surface-0 dark:bg-surface-900 p-2 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700">
            <div class="flex flex-col gap-1 mb-4 px-3 border-b border-surface-100 dark:border-surface-800 pb-3">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-lg">Articles restants ({{shoppingList.length - shoppingList.filter(i => i.checked).length}})</span>
                    <Button v-if="shoppingList.filter(i => i.checked).length > 0" icon="pi pi-trash"
                        severity="danger" text size="small" label="Vider cochés"
                        @click="deleteCheckedShoppingItems" />
                </div>
            </div>

            <div class="flex flex-col gap-1">
                <TransitionGroup name="list">
                    <div v-for="item in shoppingList" :key="item.id"
                        class="flex flex-col gap-2 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group cursor-pointer"
                        :class="{ 'opacity-50 bg-surface-50 dark:bg-surface-800/50': item.checked }"
                        @click="item.checked = !item.checked; toggleShoppingCheck(item)">
                        
                        <!-- Top Row: Checkbox, Name, Quantity -->
                        <div class="flex items-center justify-between w-full">
                            <div class="flex items-center gap-3 flex-1 overflow-hidden">
                                <Checkbox v-model="item.checked" :binary="true" :inputId="item.id || item.name" @change="toggleShoppingCheck(item)" @click.stop />
                                <label :for="item.id || item.name" class="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden" :class="{ 'line-through': item.checked }" @click.prevent>
                                    <i class="text-surface-400 dark:text-surface-500 text-xs shrink-0" :class="{
                                        'pi pi-box': item.source === 'pantry',
                                        'pi pi-sparkles': item.source === 'recipe',
                                        'pi pi-pen-to-square': item.source === 'manual' || !item.source
                                    }"></i>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ item.name }}</span>
                                </label>
                            </div>

                            <div @click.stop.prevent class="shrink-0 ml-3">
                                <InputNumber v-model="item.customQuantity" inputId="minmax-buttons" mode="decimal" showButtons buttonLayout="stacked"
                                    :min="1" :max="99" v-tooltip.top="'Quantité'" class="compact-quantity-input w-16"
                                    inputClass="w-full text-center p-inputtext-sm font-semibold px-2 py-1"
                                    @update:modelValue="updateShoppingQuantity(item, $event)" />
                            </div>
                        </div>

                        <!-- Bottom Row: Recipes and Details (indented) -->
                        <div v-if="(item.recipeNames && item.recipeNames.length > 0) || item.details" 
                             class="flex flex-wrap items-center justify-between gap-2 pl-9 w-full">
                            
                            <div v-if="item.recipeNames && item.recipeNames.length > 0" class="flex flex-wrap gap-1 flex-1">
                                <span v-for="recipe in item.recipeNames" :key="recipe" :title="recipe" class="text-[0.65rem] sm:text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 px-1.5 py-0.5 rounded-full border border-surface-200 dark:border-surface-700">
                                    {{ recipe.length > 15 ? recipe.substring(0, 15) + '...' : recipe }}
                                </span>
                            </div>
                            <div v-else class="flex-1"></div>

                            <span v-if="item.details" class="shrink-0 text-sm text-surface-600 dark:text-surface-400 font-medium ml-auto">
                                {{ item.details }}
                            </span>
                        </div>
                    </div>
                </TransitionGroup>
            </div>
        </div>
    </div>
</template>
