<script setup lang="ts">
import { ref, computed } from 'vue';
import { useParticipantStore } from '../../stores/participantStore';
import { useAllergenStore } from '../../stores/allergenStore';
import type { Participant } from '../../models/Participant';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import MultiSelect from 'primevue/multiselect';
import { useAppConfirm } from '../../composables/useAppConfirm';

const participantStore = useParticipantStore();
const allergenStore = useAllergenStore();
const { confirm } = useAppConfirm();

const sortedParticipants = computed(() => {
    return [...participantStore.participants].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});
const sortedAllergens = computed(() => {
    return [...allergenStore.allergens].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const participantDialog = ref(false);
const currentParticipant = ref<Partial<Participant>>({ name: '', isActive: true, allergyIds: [] });
const participantIsSaving = ref(false);

const openNewParticipant = () => {
    currentParticipant.value = { name: '', isActive: true, allergyIds: [] };
    participantDialog.value = true;
};
const editParticipant = (p: Participant) => {
    currentParticipant.value = { ...p, allergyIds: p.allergyIds || [] };
    participantDialog.value = true;
};
const saveParticipant = async () => {
    if (!currentParticipant.value.name) return;
    participantIsSaving.value = true;
    try {
        if (currentParticipant.value.id) {
            await participantStore.updateParticipant(currentParticipant.value.id, currentParticipant.value as Partial<Participant>);
        } else {
            await participantStore.addParticipant(currentParticipant.value as Omit<Participant, 'id'>);
        }
        participantDialog.value = false;
    } finally {
        participantIsSaving.value = false;
    }
};
const deleteParticipant = (id: string) => {
    confirm({
        title: 'Supprimer ce participant',
        message: "Supprimer ce participant ?",
        acceptLabel: 'Oui, supprimer',
        rejectLabel: 'Non',
        onAccept: async () => {
            await participantStore.deleteParticipant(id);
        }
    });
};

const getParticipantAllergenNames = (allergyIds: string[]) => {
    if (!allergyIds || allergyIds.length === 0) return 'Aucun';
    return allergenStore.allergens
        .filter(a => allergyIds.includes(a.id!))
        .map(a => a.name)
        .join(', ');
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
        <p class="text-surface-500 dark:text-surface-400">Gérez les membres de la famille et leurs spécificités alimentaires.</p>
        <Button label="Ajouter" icon="pi pi-plus" size="small" @click="openNewParticipant" />
    </div>
    
    <DataTable :value="sortedParticipants" dataKey="id" class="p-datatable-sm bg-surface-0 dark:bg-surface-900 rounded-lg shadow-sm">
        <Column field="name" header="Nom" sortable></Column>
        <Column header="Actif">
            <template #body="{ data }">
                <Tag :severity="data.isActive ? 'success' : 'secondary'" :value="data.isActive ? 'Actif' : 'Inactif'" />
            </template>
        </Column>
        <Column header="Allergènes">
            <template #body="{ data }">
                <span class="text-sm text-surface-600 dark:text-surface-400">
                    {{ getParticipantAllergenNames(data.allergyIds || []) }}
                </span>
            </template>
        </Column>
        <Column headerStyle="width: 8rem" bodyStyle="text-align: right">
            <template #body="{ data }">
                <div class="flex gap-2 justify-end">
                    <Button icon="pi pi-pencil" text rounded size="small" @click="editParticipant(data)" />
                    <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteParticipant(data.id)" />
                </div>
            </template>
        </Column>
    </DataTable>

    <Dialog v-model:visible="participantDialog" modal :header="currentParticipant.id ? 'Modifier le participant' : 'Nouveau participant'" :style="{ width: '400px' }">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-2">
                <label for="p-name" class="font-semibold text-sm">Prénom / Nom</label>
                <InputText id="p-name" v-model="currentParticipant.name" autofocus autocomplete="off" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-semibold text-sm">Actif</label>
                <div class="flex items-center gap-2">
                    <ToggleSwitch v-model="currentParticipant.isActive" />
                    <span class="text-sm text-surface-600 dark:text-surface-400">{{ currentParticipant.isActive ? 'Participe aux repas' : 'Inactif' }}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-semibold text-sm">Allergies & Intolérances</label>
                <MultiSelect 
                    v-model="currentParticipant.allergyIds" 
                    :options="sortedAllergens" 
                    optionLabel="name" 
                    optionValue="id"
                    display="chip"
                    placeholder="Sélectionner"
                    class="w-full"
                />
            </div>
        </div>
        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="participantDialog = false" />
            <Button label="Enregistrer" icon="pi pi-check" @click="saveParticipant" :loading="participantIsSaving" />
        </template>
    </Dialog>
  </div>
</template>
