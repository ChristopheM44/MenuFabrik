<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useShoppingStore } from '../stores/shoppingStore';
import { usePantryStore } from '../stores/pantryStore';

import Toast from 'primevue/toast';
import { useNotify } from '../composables/useNotify';
import { safeSetItem } from '../utils/localStorageUtils';

import ImportMealsToShoppingModal from '../components/planning/ImportMealsToShoppingModal.vue';
import DriveSyncModal from '../components/planning/DriveSyncModal.vue';
import ShoppingCartPanel from '../components/shopping/ShoppingCartPanel.vue';
import PantryPanel from '../components/shopping/PantryPanel.vue';
import PageHeader from '../components/layout/PageHeader.vue';

const shoppingStore = useShoppingStore();
const pantryStore = usePantryStore();
const { notifySuccess } = useNotify();

const activeTab = ref<'cart' | 'pantry'>('cart');
const isImportModalVisible = ref(false);
const isSyncModalVisible = ref(false);
const syncFeedbackItems = ref<any[]>([]);

const uncheckedCount = computed(() =>
    shoppingStore.shoppingItems.filter(i => !i.checked).length
);

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
    notifySuccess('Synchronisation terminée', 'Votre liste de courses a été mise à jour.');
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

    safeSetItem('menufabrik_drive_export', JSON.stringify(exportData));

    notifySuccess('Export réussi', 'Ouvrez leclercdrive.fr et cliquez sur l\'extension MenuFabrik pour ajouter ces articles.', 8000);
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
    <div class="max-w-lg mx-auto px-6 pt-4 pb-32">
        <Toast />
        <ImportMealsToShoppingModal v-model:visible="isImportModalVisible" />
        <DriveSyncModal
            v-model:visible="isSyncModalVisible"
            :items="syncFeedbackItems"
            @synced="onSynced"
        />

        <PageHeader
            icon="pi pi-shopping-cart"
            label="Courses"
            title="Courses & Placard"
            subtitle="Gérez votre caddie et vos basiques récurrents"
        />

        <!-- Segmented Control -->
        <nav class="flex p-1 bg-surface-container-low rounded-full mb-8">
            <button
                @click="activeTab = 'cart'"
                :class="activeTab === 'cart'
                    ? 'bg-surface-container-lowest shadow-sm text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'"
                class="flex-1 py-2.5 text-sm font-bold rounded-full transition-all font-headline">
                Mon Panier
                <span v-if="uncheckedCount > 0"
                    class="ml-1 px-2 py-0.5 bg-primary/10 text-[10px] rounded-full">
                    {{ uncheckedCount }}
                </span>
            </button>
            <button
                @click="activeTab = 'pantry'"
                :class="activeTab === 'pantry'
                    ? 'bg-surface-container-lowest shadow-sm text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'"
                class="flex-1 py-2.5 text-sm font-semibold rounded-full transition-all font-headline">
                Mes Placards
            </button>
        </nav>

        <!-- Panels — v-show pour conserver l'état au switch -->
        <ShoppingCartPanel
            v-show="activeTab === 'cart'"
            @importMeals="isImportModalVisible = true"
            @sendToDrive="sendToDrive"
        />
        <PantryPanel v-show="activeTab === 'pantry'" />
    </div>
</template>
