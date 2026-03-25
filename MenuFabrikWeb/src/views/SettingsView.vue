<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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

const tabs = [
    { value: 'participants', label: 'Participants', component: SettingsParticipantsTab },
    { value: 'accompagnements', label: 'Accompagnements', component: SettingsSideDishesTab },
    { value: 'allergenes', label: 'Allergènes', component: SettingsAllergensTab },
];
const activeTab = ref('participants');
const activeComponent = computed(() => tabs.find(t => t.value === activeTab.value)?.component);
</script>

<template>
    <div class="settings-view w-full max-w-5xl mx-auto p-4 animate-fadein pb-8">
        <PageHeader
            icon="pi pi-cog"
            label="Paramètres"
            title="Paramètres"
            subtitle="Gérez les préférences de l'application."
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

        <div v-else class="flex flex-col gap-6">
            <!-- Tab bar underline style -->
            <div class="flex border-b border-outline/20 dark:border-surface-700">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    @click="activeTab = tab.value"
                    :class="activeTab === tab.value
                        ? 'text-primary border-b-2 border-primary -mb-px'
                        : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent -mb-px'"
                    class="px-4 py-3 font-headline font-bold text-sm transition-all"
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- Tab content -->
            <component :is="activeComponent" />
        </div>
    </div>
</template>
