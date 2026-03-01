<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isRegistering = ref(false)

const handleSubmit = async () => {
    if (!email.value || !password.value) return
    if (isRegistering.value) {
        await authStore.registerWithEmail(email.value, password.value)
    } else {
        await authStore.loginWithEmail(email.value, password.value)
    }
}
</script>

<template>
    <div class="flex items-center justify-center min-h-screen px-4 py-8 relative">
        <Card class="w-full max-w-md shadow-lg border border-surface-200 dark:border-surface-700">
            <template #title>
                <div class="text-center text-2xl font-bold text-primary mb-2">MenuFabrik</div>
                <div class="text-center text-sm font-normal text-surface-500">
                    {{ isRegistering ? 'Créez votre espace foyer' : 'Connectez-vous à votre foyer' }}
                </div>
            </template>
            <template #content>
                <Message v-if="authStore.error" severity="error" :closable="false" class="mb-4">
                    {{ authStore.error }}
                </Message>

                <div class="flex flex-col gap-4">
                    <Button 
                        label="Continuer avec Google" 
                        icon="pi pi-google" 
                        severity="secondary" 
                        outlined 
                        class="w-full mb-2" 
                        @click="authStore.loginWithGoogle"
                        :loading="authStore.isLoading"
                    />

                    <div class="flex items-center justify-center gap-2 mb-2 text-surface-400">
                        <hr class="w-full border-surface-200 dark:border-surface-700" />
                        <span class="text-xs font-semibold">OU</span>
                        <hr class="w-full border-surface-200 dark:border-surface-700" />
                    </div>

                    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
                        <div class="flex flex-col gap-2">
                            <label for="email" class="text-sm font-semibold">Adresse Email</label>
                            <InputText id="email" v-model="email" type="email" required placeholder="nom@exemple.com" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="password" class="text-sm font-semibold">Mot de passe</label>
                            <Password id="password" v-model="password" :feedback="isRegistering" required placeholder="••••••••" toggleMask class="w-full" inputClass="w-full" />
                        </div>

                        <Button 
                            type="submit" 
                            :label="isRegistering ? 'Créer le compte' : 'Se connecter'" 
                            class="w-full mt-2" 
                            :loading="authStore.isLoading"
                        />
                    </form>

                    <div class="text-center mt-4">
                        <button 
                            type="button" 
                            class="text-sm text-primary hover:underline" 
                            @click="isRegistering = !isRegistering"
                            :disabled="authStore.isLoading"
                        >
                            {{ isRegistering ? 'Déjà un compte ? Connectez-vous' : 'Pas encore de compte ? Inscrivez-vous' }}
                        </button>
                    </div>
                </div>
            </template>
        </Card>
        
    </div>
</template>
