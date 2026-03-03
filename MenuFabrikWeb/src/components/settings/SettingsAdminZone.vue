<script setup lang="ts">
import { useAuthStore } from '../../stores/authStore';
import Card from 'primevue/card';
import Button from 'primevue/button';

const authStore = useAuthStore();

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
              </div>          </div>
      </template>
  </Card>
</template>
