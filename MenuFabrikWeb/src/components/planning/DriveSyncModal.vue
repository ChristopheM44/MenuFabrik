<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useShoppingStore } from '../../stores/shoppingStore';

const props = defineProps<{
    visible: boolean;
    items: any[];
}>();

const emit = defineEmits(['update:visible', 'synced']);

const shoppingStore = useShoppingStore();

const filteredItems = computed(() => {
    // Only show items that weren't fully successful or were skipped
    return props.items.filter(item => 
        item.status === 'skipped' || 
        item.status === 'err' || 
        (item.status === 'ok' && item.addedQuantity < item.requestedQuantity)
    );
});

const hasItemsToSync = computed(() => filteredItems.value.length > 0);

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'ok': return 'Partiel';
        case 'skipped': return 'Ignoré';
        case 'err': return 'Erreur';
        default: return status;
    }
};

const getStatusSeverity = (status: string) => {
    switch (status) {
        case 'ok': return 'warn';
        case 'skipped': return 'secondary';
        case 'err': return 'danger';
        default: return 'info';
    }
};

const handleSync = async () => {
    for (const feedback of props.items) {
        const item = shoppingStore.shoppingItems.find(i => i.id === feedback.id);
        if (!item || !item.id) continue;

        const requested = feedback.requestedQuantity || 1;
        const added = feedback.addedQuantity || 0;
        const remaining = Math.max(0, requested - added);

        if (feedback.status === 'ok' && remaining === 0) {
            // Success
            await shoppingStore.updateShoppingItem(item.id, { checked: true });
        } else {
            // Partial, skipped, or error
            // If we added some, we update the quantity to reflect what remains
            if (added > 0) {
                await shoppingStore.updateShoppingItem(item.id, { 
                    customQuantity: remaining,
                    checked: false 
                });
            } else {
                // Nothing added, just leave it unchecked
                await shoppingStore.updateShoppingItem(item.id, { checked: false });
            }
        }
    }
    
    emit('synced');
    emit('update:visible', false);
};

const close = () => {
    emit('update:visible', false);
};
</script>

<template>
    <Dialog 
        :visible="visible" 
        @update:visible="emit('update:visible', $event)"
        modal 
        header="✨ Retour du Drive" 
        :style="{ width: '90vw', maxWidth: '500px' }"
    >
        <div class="flex flex-col gap-4">
            <p class="text-surface-600 dark:text-surface-400">
                Certains articles n'ont pas pu être totalement ajoutés à votre panier Leclerc Drive. 
                Voulez-vous mettre à jour votre liste MenuFabrik ?
            </p>

            <div v-if="hasItemsToSync" class="border rounded-lg overflow-hidden border-surface-200 dark:border-surface-700">
                <DataTable :value="filteredItems" size="small" class="text-sm">
                    <Column field="name" header="Article"></Column>
                    <Column header="Status">
                        <template #body="slotProps">
                            <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" />
                        </template>
                    </Column>
                    <Column header="Restant">
                        <template #body="slotProps">
                            {{ Math.max(0, slotProps.data.requestedQuantity - slotProps.data.addedQuantity) }}
                        </template>
                    </Column>
                </DataTable>
            </div>
            <div v-else class="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-center font-medium">
                ✅ Tous les articles ont été ajoutés avec succès !
            </div>

            <div class="flex justify-end gap-2 mt-2">
                <Button label="Ignorer" severity="secondary" text @click="close" />
                <Button label="Mettre à jour ma liste" icon="pi pi-sync" @click="handleSync" />
            </div>
        </div>
    </Dialog>
</template>
