<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAllergenStore } from '../../stores/allergenStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useAppConfirm } from '../../composables/useAppConfirm';

const allergenStore = useAllergenStore();
const { confirm } = useAppConfirm();

const sortedAllergens = computed(() => {
    return [...allergenStore.allergens].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const newAllergenName = ref('');
const isAddingAllergen = ref(false);
const editingAllergens = ref([]);

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

const onAllergenEdit = async (event: any) => {
    const { newData } = event;
    if (newData.name && newData.id) {
        await allergenStore.updateAllergen(newData.id, { name: newData.name });
    }
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
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <p class="text-surface-500 dark:text-surface-400">Gérez le dictionnaire des allergènes de votre base de données.</p>
        <div class="flex items-center gap-2">
            <InputText v-model="newAllergenName" placeholder="Nouvel allergène..." size="small" @keyup.enter="quickAddAllergen" />
            <Button icon="pi pi-plus" size="small" @click="quickAddAllergen" :loading="isAddingAllergen" :disabled="!newAllergenName" />
        </div>
    </div>
    
    <DataTable :value="sortedAllergens" v-model:editingRows="editingAllergens" editMode="row" dataKey="id" @row-edit-save="onAllergenEdit" class="p-datatable-sm bg-surface-0 dark:bg-surface-900 rounded-lg shadow-sm">
        <Column field="name" header="Nom">
            <template #editor="{ data, field }">
                <InputText v-model="data[field]" autofocus />
            </template>
        </Column>
        <Column :rowEditor="true" style="width: 5rem" bodyStyle="text-align:center"></Column>
        <Column headerStyle="width: 4rem" bodyStyle="text-align: right">
            <template #body="{ data }">
                <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteAllergen(data.id)" />
            </template>
        </Column>
    </DataTable>
  </div>
</template>
