<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useShoppingStore } from '../stores/shoppingStore';
import { usePantryStore } from '../stores/pantryStore';

import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

import ImportMealsToShoppingModal from '../components/planning/ImportMealsToShoppingModal.vue';
import DriveSyncModal from '../components/planning/DriveSyncModal.vue';
import ShoppingCartPanel from '../components/shopping/ShoppingCartPanel.vue';
import PantryPanel from '../components/shopping/PantryPanel.vue';

const shoppingStore = useShoppingStore();
const pantryStore = usePantryStore();
const toast = useToast();

const isImportModalVisible = ref(false);
const isSyncModalVisible = ref(false);
const syncFeedbackItems = ref<any[]>([]);

const isDataReady = computed(() => {
    return !shoppingStore.isLoading && !pantryStore.isLoading;
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

const sendToDrive = () => {
    const itemsToExport = shoppingStore.shoppingItems.filter(i => !i.checked);

    const exportData = {
        source: 'menufabrik',
        version: 2,
        exportedAt: new Date().toISOString(),
        items: itemsToExport.map(item => ({
            id: item.id,
            name: item.name,
            searchTerm: item.name.replace(/[^a-zA-Z\sÀ-ÿ]/g, '').trim(),
            details: item.details || '',
            recipeNames: item.recipeNames || [],
            quantity: item.customQuantity !== undefined ? item.customQuantity : 1
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
</script>

<template>
    <div class="shopping-list-view max-w-4xl mx-auto p-2 sm:p-4 animate-fadein pb-8">
        <Toast />
        <ImportMealsToShoppingModal v-model:visible="isImportModalVisible" />

        <div class="mb-4 px-2">
            <h1 class="text-3xl font-bold text-on-surface flex items-center gap-3">
                <i class="pi pi-shopping-cart text-primary-500"></i>
                Courses & Placards
            </h1>
            <p class="text-on-surface-variant mt-2">Gérez votre caddie et vos basiques récurrents de n'importe où.</p>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0" class="flex items-center gap-2">
                    <i class="pi pi-cart-plus"></i>
                    <span class="font-bold">Mon Panier
                        <span
                            class="ml-1 text-xs bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded-full"
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
                    <ShoppingCartPanel v-else 
                        @importMeals="isImportModalVisible = true" 
                        @sendToDrive="sendToDrive" 
                    />
                </TabPanel>

                <!-- TAB 1: MES PLACARDS -->
                <TabPanel value="1" class="px-0 sm:px-3 py-4">
                    <PantryPanel />
                </TabPanel>
            </TabPanels>
        </Tabs>

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

:deep(.list-move),
:deep(.list-enter-active),
:deep(.list-leave-active) {
    transition: all 0.5s ease;
}

:deep(.list-enter-from),
:deep(.list-leave-to) {
    opacity: 0;
    transform: translateX(30px);
}

/* Custom styles for the compact quantity input on the Shopping List */
:deep(.compact-quantity-input.p-inputnumber) {
    min-width: 4rem; 
}
:deep(.compact-quantity-input .p-inputtext) {
    padding-right: 1.5rem !important;
}
:deep(.compact-quantity-input .p-button) {
    padding: 0;
    width: 1.5rem;
}
:deep(.compact-quantity-input .p-button .pi) {
    font-size: 0.7rem;
}
</style>
