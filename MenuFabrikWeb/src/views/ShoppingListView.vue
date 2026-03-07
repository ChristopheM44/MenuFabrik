<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useShoppingStore } from '../stores/shoppingStore';
import { usePantryStore } from '../stores/pantryStore';

import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import ImportMealsToShoppingModal from '../components/planning/ImportMealsToShoppingModal.vue';
import DriveSyncModal from '../components/planning/DriveSyncModal.vue';
import type { ShoppingItem } from '../models/ShoppingItem';

const shoppingStore = useShoppingStore();
const pantryStore = usePantryStore();
const toast = useToast();

const isImportModalVisible = ref(false);
const isSyncModalVisible = ref(false);
const syncFeedbackItems = ref<any[]>([]);
const newShoppingItemName = ref('');
const newPantryItemName = ref('');
const copySuccess = ref(false);

const confirm = useConfirm();
const editingPantryItemId = ref<string | null>(null);
const editingPantryItemName = ref('');

const isDataReady = computed(() => {
    return !shoppingStore.isLoading && !pantryStore.isLoading;
});

const shoppingList = computed(() => {
    // Sort : un-checked first, then alphabetical
    return [...shoppingStore.shoppingItems].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
});

const pantryList = computed(() => {
    return [...pantryStore.pantryItems].sort((a, b) => {
        // Selected first, then alphabetical
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
});

const handleSyncReceived = (data: any) => {
    const feedbackItems = Array.isArray(data) ? data : (data.detail || []);
    if (feedbackItems && feedbackItems.length > 0) {
        syncFeedbackItems.value = feedbackItems;
        isSyncModalVisible.value = true;
    }
};

const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'menufabrik_drive_feedback' && e.newValue) {
        try {
            const feedbackItems = JSON.parse(e.newValue);
            handleSyncReceived(feedbackItems);
        } catch (err) {
            console.error("Erreur de parsing du feedback Drive", err);
        }
    }
};

const handleCustomSyncEvent = (e: any) => {
    handleSyncReceived(e.detail);
};

const onSynced = () => {
    toast.add({
        severity: 'success',
        summary: 'Synchronisation terminée',
        detail: 'Votre liste de courses a été mise à jour.',
        life: 3000
    });
    localStorage.removeItem('menufabrik_drive_feedback');
};

onMounted(() => {
    shoppingStore.setupRealtimeListener();
    pantryStore.setupRealtimeListener();
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('MF_SYNC_RECEIVED', handleCustomSyncEvent);
});

onUnmounted(() => {
    window.removeEventListener('storage', handleStorageChange);
    document.removeEventListener('MF_SYNC_RECEIVED', handleCustomSyncEvent);
});

// --- SHOPPING LIST ACTIONS ---

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

// --- PANTRY ACTIONS ---

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

// --- MULTIPLE UPDATE HANDLERS ---
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

const togglePantrySelected = (item: any) => {
    if (item.id) {
        pantryStore.updatePantryItem(item.id, { selected: item.selected });
    }
}


// --- EXPORT & COPY ---

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

function extractCartQuantity(_details: string | undefined): number {
    return 1;
}

const sendToDrive = () => {
    const itemsToExport = shoppingStore.shoppingItems.filter(i => !i.checked);

    const exportData = {
        source: 'menufabrik',
        version: 2,
        exportedAt: new Date().toISOString(),
        items: itemsToExport.map(item => ({
            id: item.id, // Included so the extension can send it back in feedback!
            name: item.name,
            searchTerm: item.name.replace(/[^a-zA-Z\sÀ-ÿ]/g, '').trim(),
            details: item.details || '',
            recipeNames: item.recipeNames || [],
            quantity: item.customQuantity !== undefined ? item.customQuantity : extractCartQuantity(item.details)
        }))
    };

    localStorage.setItem('menufabrik_drive_export', JSON.stringify(exportData));

    toast.add({
        severity: 'success',
        summary: 'Export réussi',
        detail: 'Ouvrez leclercdrive.fr et cliquez sur l\'extension MenuFabrik pour ajouter ces articles.',
        life: 8000
    });
};

</script>

<template>
    <div class="shopping-list-view max-w-4xl mx-auto p-2 sm:p-4 animate-fadein pb-8">
        <Toast />
        <ImportMealsToShoppingModal v-model:visible="isImportModalVisible" />

        <div class="mb-4 px-2">
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 flex items-center gap-3">
                <i class="pi pi-shopping-cart text-primary-500"></i>
                Courses & Placards
            </h1>
            <p class="text-surface-500 dark:text-surface-400 mt-2">Gérez votre caddie et vos basiques récurrents de n'importe où.</p>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0" class="flex items-center gap-2">
                    <i class="pi pi-cart-plus"></i>
                    <span class="font-bold">Mon Panier
                        <span
                            class="ml-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full"
                            v-if="shoppingStore.shoppingItems.length > 0">
                            {{shoppingStore.shoppingItems.filter(i => !i.checked).length}}
                        </span>
                    </span>
                </Tab>
                <Tab value="1" class="flex items-center gap-2">
                    <i class="pi pi-box"></i>
                    <span class="font-bold">Mes Placards</span>
                </Tab>
            </TabList>

            <TabPanels>
                <!-- TAB 0: MON PANIER -->
                <TabPanel value="0" class="px-0 sm:px-3 py-4">
                    <div v-if="!isDataReady" class="flex justify-center p-12">
                        <ProgressSpinner strokeWidth="4" />
                    </div>

                    <div v-else class="flex flex-col gap-6">

                        <!-- HEADER ACTIONS -->
                        <div
                            class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-4">

                            <div class="flex flex-col md:flex-row gap-4 justify-between w-full">
                                <Button icon="pi pi-sparkles" label="D'après mes Menus"
                                    @click="isImportModalVisible = true" class="w-full md:w-auto p-button-outlined" />

                                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <Button :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'"
                                        :label="copySuccess ? 'Copié !' : 'Copier liste'"
                                        :severity="copySuccess ? 'success' : 'secondary'" @click="copyToClipboard"
                                        class="w-full sm:w-auto" :disabled="shoppingList.length === 0" />
                                    <Button icon="pi pi-refresh" label="Réinitialiser" severity="danger" outlined
                                        @click="resetShoppingList" class="w-full sm:w-auto"
                                        :disabled="shoppingList.length === 0" />
                                    <Button icon="pi pi-send" label="Drive" severity="primary" @click="sendToDrive"
                                        class="w-full sm:w-auto" :disabled="shoppingList.length === 0" />
                                </div>
                            </div>

                            <form @submit.prevent="addManualShoppingItem" class="flex mt-2">
                                <div class="p-inputgroup flex-1">
                                    <InputText v-model="newShoppingItemName"
                                        placeholder="Ajouter un article, un extra..." />
                                    <Button type="submit" icon="pi pi-plus" :disabled="!newShoppingItemName.trim()" />
                                </div>
                            </form>
                        </div>

                        <!-- LA LISTE -->
                        <div v-if="shoppingList.length === 0"
                            class="text-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                            <i class="pi pi-inbox text-4xl text-surface-400 dark:text-surface-500 mb-3 block"></i>
                            <h3 class="font-semibold text-lg">Votre panier est vide</h3>
                            <p class="text-surface-500 dark:text-surface-400 mt-1">Importez vos ingrédients de la semaine ou ajoutez des
                                articles manuellement.</p>
                        </div>

                        <div v-else
                            class="bg-surface-0 dark:bg-surface-900 p-2 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700">
                            <div
                                class="flex flex-col gap-1 mb-4 px-3 border-b border-surface-100 dark:border-surface-800 pb-3">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-lg">Articles restants ({{shoppingList.length -
                                        shoppingList.filter(i => i.checked).length}})</span>
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
                                                <Checkbox v-model="item.checked" :binary="true" :inputId="item.id || item.name"
                                                    @change="toggleShoppingCheck(item)" @click.stop />
                                                    
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
                                                <InputNumber 
                                                    v-model="item.customQuantity" 
                                                    inputId="minmax-buttons" 
                                                    mode="decimal" 
                                                    showButtons 
                                                    buttonLayout="stacked"
                                                    :min="1" 
                                                    :max="99" 
                                                    v-tooltip.top="'Quantité'"
                                                    class="compact-quantity-input w-16"
                                                    inputClass="w-full text-center p-inputtext-sm font-semibold px-2 py-1"
                                                    @update:modelValue="updateShoppingQuantity(item, $event)"
                                                />
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

                                            <span v-if="item.details"
                                                class="shrink-0 text-sm text-surface-600 dark:text-surface-400 font-medium ml-auto">
                                                {{ item.details }}
                                            </span>
                                        </div>

                                    </div>
                                </TransitionGroup>
                            </div>
                        </div>

                    </div>
                </TabPanel>

                <!-- TAB 1: MES PLACARDS -->
                <TabPanel value="1" class="px-0 sm:px-3 py-4">
                    <div
                        class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-5">

                        <div>
                            <h3 class="font-bold text-lg mb-1">Stock de la maison</h3>
                            <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">Cochez les produits du quotidien qu'il manque dans
                                vos placards pour les transférer ensuite dans votre panier.</p>

                            <form @submit.prevent="addPantryItem" class="flex mb-4">
                                <div class="p-inputgroup flex-1">
                                    <InputText v-model="newPantryItemName"
                                        placeholder="Ajouter un basique (Papier toilette, Huile...)" />
                                    <Button type="submit" icon="pi pi-plus" :disabled="!newPantryItemName.trim()" />
                                </div>
                            </form>
                        </div>

                        <div v-if="pantryList.length === 0"
                            class="text-center p-6 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
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
                                        <Button icon="pi pi-check" size="small" rounded text severity="success"
                                            @click.stop="saveRenamePantryItem(item)" />
                                        <Button icon="pi pi-times" size="small" rounded text severity="secondary"
                                            @click.stop="cancelRenamePantryItem()" />
                                    </div>
                                    <div class="flex opacity-80 group-hover:opacity-100 transition-opacity" v-else>
                                        <Button icon="pi pi-pen-to-square" text rounded severity="secondary"
                                            size="small" :class="[
                                                item.selected ? 'dark:text-white text-surface-900' : 'group-hover:text-surface-900 dark:group-hover:text-white',
                                                'transition-colors'
                                            ]" @click.stop="startRenamePantryItem(item)" />
                                        <Button icon="pi pi-trash" text rounded severity="danger" size="small" :class="[
                                            item.selected ? 'dark:text-white' : 'dark:group-hover:text-white',
                                            'transition-colors'
                                        ]" @click.stop="deletePantryItem(item.id)" />
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
                </TabPanel>
            </TabPanels>
        </Tabs>

        <!-- Modals -->
        <ImportMealsToShoppingModal v-model:visible="isImportModalVisible" />
        
        <DriveSyncModal 
            v-model:visible="isSyncModalVisible" 
            :items="syncFeedbackItems"
            @synced="onSynced"
        />
    </div>
</template>

<style scoped>
.animate-fadein {
    animation: fadein 0.3s ease-out forwards;
}

@keyframes fadein {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.list-move,
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* Custom styles for the compact quantity input on the Shopping List */
:deep(.compact-quantity-input.p-inputnumber) {
    /* Stacked layout takes minimal width naturally if overridden */
    min-width: 4rem; 
}
:deep(.compact-quantity-input .p-inputtext) {
    padding-right: 1.5rem !important; /* Make room for the stacked buttons on the right */
}
:deep(.compact-quantity-input .p-button) {
    padding: 0;
    width: 1.5rem;
}
:deep(.compact-quantity-input .p-button .pi) {
    font-size: 0.7rem;
}
</style>
