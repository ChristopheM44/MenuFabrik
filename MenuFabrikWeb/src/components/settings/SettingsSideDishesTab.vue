<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSideDishStore } from '../../stores/sideDishStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useAppConfirm } from '../../composables/useAppConfirm';

const sideDishStore = useSideDishStore();
const { confirm } = useAppConfirm();

const sortedSideDishes = computed(() => {
    return [...sideDishStore.sideDishes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const newSideDishName = ref('');
const isAddingSideDish = ref(false);
const editingSideDishes = ref([]);

const quickAddSideDish = async () => {
    if (!newSideDishName.value.trim()) return;
    isAddingSideDish.value = true;
    try {
        const name = newSideDishName.value.trim();
        await sideDishStore.addSideDish({ name: name });
        newSideDishName.value = '';
    } finally {
        isAddingSideDish.value = false;
    }
};

const onSideDishEdit = async (event: any) => {
    const { newData } = event;
    if (newData.name && newData.id) {
        await sideDishStore.updateSideDish(newData.id, { 
            name: newData.name
        });
    }
};

const deleteSideDish = (id: string) => {
    confirm({
        title: 'Supprimer cet accompagnement',
        message: "Supprimer cet accompagnement ?",
        acceptLabel: 'Oui, supprimer',
        rejectLabel: 'Non',
        onAccept: async () => {
            await sideDishStore.deleteSideDish(id);
        }
    });
};
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <p class="text-surface-500 dark:text-surface-400">Personnalisez la liste des accompagnements disponibles pour vos plats.</p>
        <div class="flex items-center gap-2">
            <InputText v-model="newSideDishName" placeholder="Nouvel accompagnement..." size="small" @keyup.enter="quickAddSideDish" />
            <Button icon="pi pi-plus" size="small" @click="quickAddSideDish" :loading="isAddingSideDish" :disabled="!newSideDishName" />
        </div>
    </div>
    
    <DataTable :value="sortedSideDishes" v-model:editingRows="editingSideDishes" editMode="row" dataKey="id" @row-edit-save="onSideDishEdit" class="p-datatable-sm bg-surface-0 dark:bg-surface-900 rounded-lg shadow-sm">
        <Column field="name" header="Nom">
            <template #editor="{ data, field }">
                <InputText v-model="data[field]" autofocus />
            </template>
        </Column>
        <Column :rowEditor="true" style="width: 5rem" bodyStyle="text-align:center"></Column>
        <Column headerStyle="width: 4rem" bodyStyle="text-align: right">
            <template #body="{ data }">
                <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteSideDish(data.id)" />
            </template>
        </Column>
    </DataTable>
  </div>
</template>
