<script setup lang="ts">
import { ref } from 'vue';
import { seedDatabase } from '../services/DataSeeder';
import Button from 'primevue/button';
import Message from 'primevue/message';

const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const runPublicDataSeeding = async () => {
    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    try {
        await seedDatabase();
        successMessage.value = "La base de données publique a été peuplée avec succès. Les nouveaux utilisateurs auront accès à ces recettes pré-enregistrées.";
    } catch (e: any) {
        console.error(e);
        errorMessage.value = "Erreur lors de l'injection : " + e.message;
    } finally {
        isLoading.value = false;
    }
};

</script>

<template>
    <div class="max-w-3xl mx-auto p-4 animate-fadein">
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-red-600 dark:text-red-400 border-l-4 pl-3 border-red-500 mb-2">
                Administration Globale
            </h1>
            <p class="text-surface-600 dark:text-surface-400">
                Espace réservé à l'administration de la plateforme transversale MenuFabrik.
            </p>
        </div>

        <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-6 shadow-sm">
            <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-4 border-b border-surface-200 dark:border-surface-700 pb-2">
                Peuplement de la Base Publique (Seeding)
            </h2>
            
            <p class="text-surface-600 dark:text-surface-400 mb-6 text-sm">
                Cette action va <strong>écraser et recréer de zéro</strong> toutes les données publiques communes partagées avec tous les utilisateurs (Recettes publiques, Allergènes, Accompagnements). 
                <br>Utilisez cette fonctionnalité avec précaution, principalement lors de la première configuration de l'application.
            </p>

            <Message v-if="successMessage" severity="success" class="mb-4" :closable="false">{{ successMessage }}</Message>
            <Message v-if="errorMessage" severity="error" class="mb-4" :closable="false">{{ errorMessage }}</Message>

            <div class="flex items-center gap-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <i class="pi pi-exclamation-triangle text-orange-500 text-2xl"></i>
                <div class="flex-1">
                    <Button 
                        label="Injecter les données par défaut (Globales)" 
                        icon="pi pi-database" 
                        severity="danger" 
                        @click="runPublicDataSeeding" 
                        :loading="isLoading"
                        class="w-full sm:w-auto"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
</style>

