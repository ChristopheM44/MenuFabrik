<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { useAllergenStore } from '../stores/allergenStore';
import { useTheme } from '../composables/useTheme';
import { useAuthStore } from '../stores/authStore';

// Components
import SettingsParticipantsTab from '../components/settings/SettingsParticipantsTab.vue';
import SettingsSideDishesTab from '../components/settings/SettingsSideDishesTab.vue';
import SettingsAllergensTab from '../components/settings/SettingsAllergensTab.vue';
import PageHeader from '../components/layout/PageHeader.vue';

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
const { isDark, toggleTheme } = useTheme();
const authStore = useAuthStore();

const logout = async () => {
    await authStore.logout();
};

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
        <PageHeader
            icon="pi pi-cog"
            label="Paramètres"
            title="Paramètres de la famille"
            subtitle="Gérez les préférences de vos convives et du foyer."
        >
            <template #actions>
                <button @click="toggleTheme" class="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant focus:outline-none" aria-label="Basculer le thème">
                    <i :class="isDark ? 'pi pi-moon text-primary' : 'pi pi-sun text-orange-500'" class="text-xl"></i>
                </button>
                <button v-if="authStore.user" @click="logout" :title="`Connecté en tant que : ${authStore.user.email}`" class="p-2 rounded-full hover:bg-red-50 transition-colors text-on-surface-variant hover:text-red-600 focus:outline-none" aria-label="Se déconnecter">
                    <i class="pi pi-sign-out text-xl"></i>
                </button>
            </template>
        </PageHeader>

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
