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
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

import ImportMealsToShoppingModal from '../components/planning/ImportMealsToShoppingModal.vue';
import type { ShoppingItem } from '../models/ShoppingItem';

const shoppingStore = useShoppingStore();
const pantryStore = usePantryStore();
const toast = useToast();

const isImportModalVisible = ref(false);
const newShoppingItemName = ref('');
const newPantryItemName = ref('');
const copySuccess = ref(false);

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

const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'menufabrik_drive_feedback' && e.newValue) {
        try {
            const feedbackItems = JSON.parse(e.newValue);
            let updatedCount = 0;
            
            feedbackItems.forEach((item: any) => {
                // If Copilot marked it as "ok" (added) or "skipped" (user manually bypassed),
                // we consider it "done" on our side.
                if (item.id && (item._status === 'ok' || item._status === 'skipped')) {
                    const storeItem = shoppingStore.shoppingItems.find(i => i.id === item.id);
                    if (storeItem && !storeItem.checked) {
                        shoppingStore.updateShoppingItem(item.id, { checked: true });
                        updatedCount++;
                    }
                }
            });

            if (updatedCount > 0) {
                toast.add({ 
                    severity: 'success', 
                    summary: 'Drive Synchronisé', 
                    detail: `${updatedCount} article(s) ajouté(s) au Drive ont été cochés.`, 
                    life: 5000 
                });
            }
            
            // Clean up the feedback so we don't process it again
            localStorage.removeItem('menufabrik_drive_feedback');
        } catch (err) {
            console.error("Erreur de parsing du feedback Drive", err);
        }
    }
};

onMounted(() => {
    shoppingStore.setupRealtimeListener();
    pantryStore.setupRealtimeListener();
    window.addEventListener('storage', handleStorageChange);
});

onUnmounted(() => {
    window.removeEventListener('storage', handleStorageChange);
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
    if (confirm("Voulez-vous vraiment supprimer tous les articles cochés de votre panier ?")) {
        try {
            await shoppingStore.clearCheckedItems();
            toast.add({ severity: 'success', summary: 'Nettoyage terminé', detail: 'Les articles terminés ont été supprimés.', life: 3000 });
        } catch (e: any) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
        }
    }
};

const deletePantryItem = async (id: string | undefined) => {
    if(!id) return;
    if (confirm("Voulez-vous supprimer ce basique de vos placards ?")) {
         try {
            await pantryStore.deletePantryItem(id);
        } catch (e: any) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 3000 });
        }
    }
}

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
    if(item.id) {
        shoppingStore.updateShoppingItem(item.id, { checked: item.checked });
    }
}

const togglePantrySelected = (item: any) => {
    if(item.id) {
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
            quantity: extractCartQuantity(item.details)
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
            <p class="text-surface-500 mt-2">Gérez votre caddie et vos basiques récurrents de n'importe où.</p>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0" class="flex items-center gap-2">
                    <i class="pi pi-cart-plus"></i>
                    <span class="font-bold">Mon Panier 
                        <span class="ml-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full" v-if="shoppingStore.shoppingItems.length > 0">
                            {{ shoppingStore.shoppingItems.filter(i => !i.checked).length }}
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
                        <div class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-4">
                            
                            <div class="flex flex-col md:flex-row gap-4 justify-between w-full">
                                <Button 
                                    icon="pi pi-sparkles" 
                                    label="D'après mes Menus" 
                                    @click="isImportModalVisible = true" 
                                    class="w-full md:w-auto p-button-outlined"
                                />

                                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <Button 
                                        :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'" 
                                        :label="copySuccess ? 'Copié !' : 'Copier text'" 
                                        :severity="copySuccess ? 'success' : 'secondary'"
                                        @click="copyToClipboard" 
                                        class="w-full sm:w-auto"
                                        :disabled="shoppingList.length === 0"
                                    />
                                    <Button 
                                        icon="pi pi-send" 
                                        label="Drive" 
                                        severity="primary"
                                        @click="sendToDrive" 
                                        class="w-full sm:w-auto"
                                        :disabled="shoppingList.length === 0"
                                    />
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
                        <div v-if="shoppingList.length === 0" class="text-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                            <i class="pi pi-inbox text-4xl text-surface-400 mb-3 block"></i>
                            <h3 class="font-semibold text-lg">Votre panier est vide</h3>
                            <p class="text-surface-500 mt-1">Importez vos ingrédients de la semaine ou ajoutez des articles manuellement.</p>
                        </div>

                        <div v-else class="bg-surface-0 dark:bg-surface-900 p-2 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col gap-1 mb-4 px-3 border-b border-surface-100 dark:border-surface-800 pb-3">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-lg">Articles restants ({{ shoppingList.length - shoppingList.filter(i => i.checked).length }})</span>
                                    <Button v-if="shoppingList.filter(i=>i.checked).length > 0" icon="pi pi-trash" severity="danger" text size="small" label="Vider cochés" @click="deleteCheckedShoppingItems" />
                                </div>
                            </div>

                            <div class="flex flex-col gap-1">
                                <TransitionGroup name="list">
                                    <div 
                                        v-for="item in shoppingList" 
                                        :key="item.id"
                                        class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer group"
                                        :class="{'opacity-40 bg-surface-50 dark:bg-surface-800/50': item.checked}"
                                        @click="item.checked = !item.checked; toggleShoppingCheck(item)"
                                    >
                                        <Checkbox v-model="item.checked" :binary="true" :inputId="item.id || item.name" @change="toggleShoppingCheck(item)" @click.stop />
                                        <label 
                                            :for="item.id || item.name" 
                                            class="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                                            :class="{'line-through': item.checked}"
                                        >
                                            <div class="flex items-center gap-2">
                                                <i class="text-surface-400 text-xs" :class="{
                                                    'pi pi-box': item.source === 'pantry',
                                                    'pi pi-sparkles': item.source === 'recipe',
                                                    'pi pi-pen-to-square': item.source === 'manual' || !item.source
                                                }"></i>
                                                <span class="font-semibold text-surface-900 dark:text-surface-0">{{ item.name }}</span>
                                            </div>
                                            <span v-if="item.details" class="text-sm text-primary-700 dark:text-primary-700 font-medium sm:ml-4 bg-primary-100 dark:bg-primary-900/50 border border-primary-200 dark:border-primary-800 px-2 py-0.5 rounded-md inline-block w-fit mt-1 sm:mt-0">
                                                {{ item.details }}
                                            </span>
                                        </label>
                                    </div>
                                </TransitionGroup>
                            </div>
                        </div>

                    </div>
                </TabPanel>

                <!-- TAB 1: MES PLACARDS -->
                <TabPanel value="1" class="px-0 sm:px-3 py-4">
                    <div class="bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-5">
                        
                        <div>
                            <h3 class="font-bold text-lg mb-1">Stock de la maison</h3>
                            <p class="text-surface-500 text-sm mb-4">Cochez les produits du quotidien qu'il manque dans vos placards pour les transférer ensuite dans votre panier.</p>
                            
                            <form @submit.prevent="addPantryItem" class="flex mb-4">
                                <div class="p-inputgroup flex-1">
                                    <InputText v-model="newPantryItemName" placeholder="Ajouter un basique (Papier toilette, Huile...)" />
                                    <Button type="submit" icon="pi pi-plus" :disabled="!newPantryItemName.trim()" />
                                </div>
                            </form>
                        </div>

                        <div v-if="pantryList.length === 0" class="text-center p-6 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                            <p class="text-surface-500">Aucun basique enregistré. Ajoutez-en un au dessus !</p>
                        </div>

                        <div v-else class="flex flex-col gap-1">
                            <TransitionGroup name="list">
                                <div 
                                    v-for="item in pantryList" 
                                    :key="item.id"
                                    class="flex items-center gap-3 p-2 px-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer group"
                                    :class="{'bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50': item.selected}"
                                    @click="item.selected = !item.selected; togglePantrySelected(item)"
                                >
                                    <Checkbox v-model="item.selected" :binary="true" :inputId="'pantry-'+item.id" @change="togglePantrySelected(item)" @click.stop />
                                    <label :for="'pantry-'+item.id" class="flex-1 cursor-pointer font-medium text-surface-900 dark:text-surface-0">
                                        {{ item.name }}
                                    </label>
                                    <Button icon="pi pi-times" text rounded severity="secondary" size="small" class="opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="deletePantryItem(item.id)" />
                                </div>
                            </TransitionGroup>
                        </div>

                        <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-end">
                            <Button 
                                icon="pi pi-cart-arrow-down" 
                                :label="`Transférer (${pantryList.filter(i => i.selected).length}) dans Mon Panier`" 
                                @click="transferPantryToShopping"
                                :disabled="pantryList.filter(i => i.selected).length === 0"
                            />
                        </div>

                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>
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
</style>
