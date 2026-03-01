<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { seedDatabase } from '../services/DataSeeder';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { useAllergenStore } from '../stores/allergenStore';

import type { Participant } from '../models/Participant';
import type { SideDish } from '../models/SideDish';
import type { Allergen } from '../models/Allergen';

// PrimeVue
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import MultiSelect from 'primevue/multiselect';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';

const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();
const allergenStore = useAllergenStore();

const confirmDialogService = useConfirm();

const isDataReady = computed(() => {
    return !participantStore.isLoading && !sideDishStore.isLoading && !allergenStore.isLoading;
});

onMounted(async () => {
    // Les stores devraient déjà avoir le realtime, on setup si vide
    if (participantStore.participants.length === 0) participantStore.setupRealtimeListener();
    if (sideDishStore.sideDishes.length === 0) sideDishStore.setupRealtimeListener();
    if (allergenStore.allergens.length === 0) allergenStore.setupRealtimeListener();
});

// Computed pour le tri alphabétique global
const sortedParticipants = computed(() => {
    return [...participantStore.participants].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});
const sortedSideDishes = computed(() => {
    return [...sideDishStore.sideDishes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});
const sortedAllergens = computed(() => {
    return [...allergenStore.allergens].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

// --- PARTICIPANTS ---
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
    confirmDialogService.require({
        message: "Supprimer ce participant ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
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

// --- ACCOMPAGNEMENTS ---
const newSideDishName = ref('');
const isAddingSideDish = ref(false);
const editingSideDishes = ref([]);

const quickAddSideDish = async () => {
    if (!newSideDishName.value.trim()) return;
    isAddingSideDish.value = true;
    try {
        const name = newSideDishName.value.trim();
        await sideDishStore.addSideDish({ name: name, pluralName: name + 's' });
        newSideDishName.value = '';
    } finally {
        isAddingSideDish.value = false;
    }
};
const onSideDishEdit = async (event: any) => {
    const { newData } = event;
    if (newData.name && newData.id) {
        await sideDishStore.updateSideDish(newData.id, { 
            name: newData.name, 
            pluralName: newData.name + 's' 
        });
    }
};
const deleteSideDish = (id: string) => {
    confirmDialogService.require({
        message: "Supprimer cet accompagnement ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
            await sideDishStore.deleteSideDish(id);
        }
    });
};

// --- ALLERGENES ---
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
    confirmDialogService.require({
        message: "Supprimer cet allergène ?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Oui",
        rejectLabel: "Non",
        acceptClass: "p-button-danger",
        accept: async () => {
            await allergenStore.deleteAllergen(id);
        }
    });
};


// --- ADMIN SEEDER ---
const isSeeding = ref(false);
const seedMessage = ref('');
const isError = ref(false);

const runSeeder = async () => {
    isSeeding.value = true;
    seedMessage.value = '';
    isError.value = false;
    
    try {
        await seedDatabase();
        seedMessage.value = "Données injectées avec succès !";
    } catch (e: any) {
        isError.value = true;
        seedMessage.value = "Erreur lors de l'injection : " + e.message;
    } finally {
        isSeeding.value = false;
    }
};
</script>

<template>
  <div class="settings-view w-full max-w-5xl mx-auto p-4 animate-fadein pb-24">
      <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 border-l-4 pl-3 border-primary-500">Paramètres de la famille</h1>
      </div>

      <div v-if="!isDataReady" class="flex justify-center p-12">
          <ProgressSpinner strokeWidth="4" />
      </div>

      <div v-else class="flex flex-col gap-8">
          
          <Tabs value="0">
              <TabList>
                  <Tab value="0"><i class="pi pi-users mr-2"></i> Participants</Tab>
                  <Tab value="1"><i class="pi pi-tags mr-2"></i> Accompagnements</Tab>
                  <Tab value="2"><i class="pi pi-exclamation-triangle mr-2"></i> Allergènes</Tab>
              </TabList>
              
              <TabPanels>
                  <!-- ONGLETS PARTICIPANTS -->
                  <TabPanel value="0">
                      <div class="flex justify-between items-center mb-4">
                          <p class="text-surface-500">Gérez les membres de la famille et leurs spécificités alimentaires.</p>
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
                  </TabPanel>

                  <!-- ONGLET ACCOMPAGNEMENTS -->
                  <TabPanel value="1">
                      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                          <p class="text-surface-500">Personnalisez la liste des accompagnements disponibles pour vos plats.</p>
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
                  </TabPanel>

                  <!-- ONGLET ALLERGENES -->
                  <TabPanel value="2">
                      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                          <p class="text-surface-500">Gérez le dictionnaire des allergènes de votre base de données.</p>
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
                  </TabPanel>
              </TabPanels>
          </Tabs>

          <!-- Zone Administrateur -->
          <Card class="mt-8 border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 shadow-none">
              <template #title>
                  <span class="text-red-600 dark:text-red-400 text-lg flex items-center gap-2">
                      <i class="pi pi-cog"></i> Zone Administrateur
                  </span>
              </template>
              <template #content>
                  <p class="text-surface-600 dark:text-surface-400 mb-4 text-sm">
                      Cette action va injecter (ou remplacer) les données de démonstration dans Firebase. 
                      Elle inclut plusieurs recettes complètes avec leurs dépendances.
                  </p>
                  <div class="flex items-center gap-4">
                      <Button 
                          label="Injecter les données de test (Seed)" 
                          icon="pi pi-database" 
                          severity="danger"
                          outlined
                          size="small"
                          :loading="isSeeding"
                          @click="runSeeder"
                      />
                      <div v-if="seedMessage" class="text-sm font-medium" :class="isError ? 'text-red-600' : 'text-green-600'">
                          <i :class="isError ? 'pi pi-times-circle' : 'pi pi-check-circle'" class="mr-1"></i>
                          {{ seedMessage }}
                      </div>
                  </div>
              </template>
          </Card>

      </div>

      <!-- MODALS -->

      <!-- Modal Participant -->
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
                      <span class="text-sm text-surface-600">{{ currentParticipant.isActive ? 'Participe aux repas' : 'Inactif' }}</span>
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

      <!-- Composant essentiel pour que useConfirm() affiche la boite de dialogue -->
      <ConfirmDialog></ConfirmDialog>

  </div>
</template>
