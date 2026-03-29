<script setup lang="ts">
import { ref, computed } from 'vue';
import { useParticipantStore } from '../../stores/participantStore';
import { useAllergenStore } from '../../stores/allergenStore';
import type { Participant } from '../../models/Participant';
import ToggleSwitch from 'primevue/toggleswitch';
import MultiSelect from 'primevue/multiselect';
import { useAppConfirm } from '../../composables/useAppConfirm';
import { useNotify } from '../../composables/useNotify';

const participantStore = useParticipantStore();
const allergenStore = useAllergenStore();
const { confirm } = useAppConfirm();
const { notifyError } = useNotify();

const sortedParticipants = computed(() => {
    return [...participantStore.participants].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});
const sortedAllergens = computed(() => {
    return [...allergenStore.allergens].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const avatarColors = [
    'bg-primary-container text-on-primary-container',
    'bg-tertiary-container text-on-tertiary-container',
    'bg-secondary-fixed text-on-secondary-fixed',
];

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
    } catch {
        notifyError('Erreur', 'Impossible d\'enregistrer le participant.');
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
            try {
                await participantStore.deleteParticipant(id);
            } catch {
                notifyError('Erreur', 'Impossible de supprimer le participant.');
            }
        }
    });
};

const getParticipantAllergenNames = (allergyIds: string[]) => {
    if (!allergyIds || allergyIds.length === 0) return '';
    return allergenStore.allergens
        .filter(a => allergyIds.includes(a.id!))
        .map(a => a.name)
        .join(', ');
};

const hasAllergens = (p: Participant) => p.allergyIds && p.allergyIds.length > 0;
</script>

<template>
  <div>
    <!-- Participant cards -->
    <div class="space-y-3">
        <div
            v-for="(p, index) in sortedParticipants"
            :key="p.id"
            class="flex items-center gap-4 p-5 bg-surface-container-lowest dark:bg-surface-800 rounded-3xl transition-all hover:bg-white dark:hover:bg-surface-700 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
        >
            <!-- Avatar -->
            <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-headline font-bold text-lg shrink-0"
                :class="avatarColors[index % avatarColors.length]"
            >
                {{ p.name[0]?.toUpperCase() }}
            </div>

            <!-- Nom + allergènes -->
            <div class="flex-1 min-w-0">
                <div class="font-headline font-bold text-on-surface text-base md:text-lg truncate">{{ p.name }}</div>
                <div v-if="hasAllergens(p)" class="flex items-center gap-1 mt-0.5 text-xs text-on-surface-variant">
                    <span class="material-symbols-outlined text-error" style="font-size: 0.875rem">warning</span>
                    <span class="truncate">{{ getParticipantAllergenNames(p.allergyIds || []) }}</span>
                </div>
            </div>

            <!-- Statut -->
            <span
                class="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0"
                :class="p.isActive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'"
            >
                {{ p.isActive ? 'Actif' : 'Inactif' }}
            </span>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                    @click="editParticipant(p)"
                    class="p-2 rounded-xl text-outline hover:text-primary hover:bg-primary-container/20 transition-all active:scale-90"
                    aria-label="Modifier"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">edit</span>
                </button>
                <button
                    @click="deleteParticipant(p.id!)"
                    class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/10 transition-all active:scale-90"
                    aria-label="Supprimer"
                >
                    <span class="material-symbols-outlined text-[1.25rem]">delete</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Bouton ajouter -->
    <div class="flex justify-end pt-6">
        <button
            @click="openNewParticipant"
            class="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-90 transition-all"
            aria-label="Ajouter un membre"
        >
            <span class="material-symbols-outlined">add</span>
        </button>
    </div>

    <!-- Modal ajout / édition -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="participantDialog" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="participantDialog = false" />

          <!-- Sheet -->
          <div class="modal-sheet relative w-full max-w-md bg-surface-bright rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">

            <!-- TopAppBar sticky -->
            <header class="shrink-0 sticky top-0 z-10 bg-surface-bright/80 backdrop-blur-md flex justify-between items-center px-4 py-3 border-b border-outline-variant/10 rounded-t-2xl sm:rounded-t-2xl">
              <h1 class="font-headline font-bold text-lg tracking-tight text-on-surface">
                {{ currentParticipant.id ? 'Modifier le participant' : 'Nouveau Participant' }}
              </h1>
              <button
                @click="participantDialog = false"
                class="p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95"
              >
                <span class="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </header>

            <!-- Scrollable content -->
            <div class="overflow-y-auto">
              <div class="p-8 space-y-8">

                <!-- Hero gradient -->
                <div class="w-full h-32 rounded-2xl overflow-hidden relative bg-gradient-to-br from-primary/30 via-secondary/20 to-tertiary/20">
                  <div class="absolute inset-0 bg-gradient-to-t from-surface-bright/50 to-transparent" />
                </div>

                <!-- Section header -->
                <div class="space-y-1">
                  <h2 class="font-headline font-extrabold text-3xl tracking-tighter text-on-surface">
                    {{ currentParticipant.id ? 'Modifier le profil' : 'Nouveau participant' }}
                  </h2>
                  <p class="text-on-surface-variant text-sm font-medium">
                    {{ currentParticipant.id ? 'Modifiez les informations du participant.' : 'Ajoutez un nouveau membre à votre table culinaire.' }}
                  </p>
                </div>

                <!-- Form -->
                <form class="space-y-6" @submit.prevent="saveParticipant">

                  <!-- Nom -->
                  <div class="space-y-3">
                    <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Prénom / Nom</label>
                    <input
                      v-model="currentParticipant.name"
                      type="text"
                      placeholder="Ex: Alexandre"
                      autofocus
                      autocomplete="off"
                      class="w-full bg-surface-container-low dark:bg-surface-700 border-none rounded-xl px-5 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none"
                    />
                  </div>

                  <!-- Statut actif -->
                  <div class="flex items-center justify-between p-5 bg-surface-container-low dark:bg-surface-700 rounded-2xl">
                    <div class="space-y-0.5">
                      <span class="font-headline font-bold text-on-surface">Actif</span>
                      <p class="text-on-surface-variant text-sm">Participe aux repas</p>
                    </div>
                    <ToggleSwitch v-model="currentParticipant.isActive" />
                  </div>

                  <!-- Allergies -->
                  <div class="space-y-3">
                    <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Allergies &amp; Intolérances</label>
                    <MultiSelect
                      v-model="currentParticipant.allergyIds"
                      :options="sortedAllergens"
                      optionLabel="name"
                      optionValue="id"
                      display="chip"
                      placeholder="Sélectionner des options..."
                      class="w-full"
                    />
                  </div>

                </form>

                <!-- Footer actions -->
                <div class="pt-4 space-y-3 pb-8 sm:pb-4">
                  <button
                    @click="saveParticipant"
                    :disabled="participantIsSaving"
                    class="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-on-primary font-headline font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {{ participantIsSaving ? 'Enregistrement…' : (currentParticipant.id ? 'Mettre à jour le profil' : 'Enregistrer le profil') }}
                  </button>
                  <button
                    @click="participantDialog = false"
                    class="w-full py-3 text-on-surface-variant font-headline font-semibold text-sm hover:text-on-surface transition-colors"
                  >
                    Annuler
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Backdrop */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Sheet slide-up on mobile, scale on desktop */
.modal-enter-active .modal-sheet,
.modal-leave-active .modal-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-enter-from .modal-sheet,
.modal-leave-to .modal-sheet {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .modal-sheet,
  .modal-leave-to .modal-sheet {
    transform: scale(0.95) translateY(0);
  }
}
</style>
