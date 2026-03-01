<script setup lang="ts">
import { ref } from 'vue';
import { seedDatabase } from '../../services/DataSeeder';
import { useAuthStore } from '../../stores/authStore';
import Card from 'primevue/card';
import Button from 'primevue/button';

const authStore = useAuthStore();
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

const logout = async () => {
    await authStore.logout();
};
</script>

<template>
  <Card class="mt-8 border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 shadow-none">
      <template #title>
          <span class="text-red-600 dark:text-red-400 text-lg flex items-center gap-2">
              <i class="pi pi-cog"></i> Zone Administrateur / Compte
          </span>
      </template>
      <template #content>
          <p class="text-surface-600 dark:text-surface-400 mb-4 text-sm">
              Gérez votre compte et les données de l'application.
          </p>
          <div class="flex flex-col gap-4">
              <div class="flex items-center gap-4">
                  <Button 
                      label="Se déconnecter" 
                      icon="pi pi-sign-out" 
                      severity="secondary"
                      outlined
                      size="small"
                      @click="logout"
                  />
                  <div class="text-sm text-surface-500">
                      Connecté en tant que : <strong>{{ authStore.user?.email || 'Inconnu' }}</strong>
                  </div>
              </div>

              <hr class="border-red-200 dark:border-red-800 my-2" />

              <div class="flex items-center gap-4">
                  <Button 
                      label="Injecter les données par défaut (Globales)" 
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
          </div>
      </template>
  </Card>
</template>
