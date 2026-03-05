<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { useAllergenStore } from '../stores/allergenStore';

// Components
import SettingsParticipantsTab from '../components/settings/SettingsParticipantsTab.vue';
import SettingsSideDishesTab from '../components/settings/SettingsSideDishesTab.vue';
import SettingsAllergensTab from '../components/settings/SettingsAllergensTab.vue';

// PrimeVue
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ProgressSpinner from 'primevue/progressspinner';

const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();
const allergenStore = useAllergenStore();

const isDataReady = computed(() => {
    return !participantStore.isLoading && !sideDishStore.isLoading && !allergenStore.isLoading;
});

onMounted(async () => {
    if (participantStore.participants.length === 0) participantStore.setupRealtimeListener();
    if (sideDishStore.sideDishes.length === 0) sideDishStore.setupRealtimeListener();
    if (allergenStore.allergens.length === 0) allergenStore.setupRealtimeListener();
});
</script>

<template>
    <div class="settings-view w-full max-w-5xl mx-auto p-4 animate-fadein pb-8">
        <div class="flex items-center justify-between mb-6 px-2">
            <div>
                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 flex items-center gap-3">
                    <i class="pi pi-cog text-primary-500"></i>
                    Paramètres de la famille
                </h1>
                <p class="text-surface-500 dark:text-surface-400 mt-2">Gérez les préférences de vos convives et du
                    foyer.</p>
            </div>
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
                        <SettingsParticipantsTab />
                    </TabPanel>

                    <!-- ONGLET ACCOMPAGNEMENTS -->
                    <TabPanel value="1">
                        <SettingsSideDishesTab />
                    </TabPanel>

                    <!-- ONGLET ALLERGENES -->
                    <TabPanel value="2">
                        <SettingsAllergensTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

    </div>
</template>
