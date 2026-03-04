<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Meal } from '../../models/Meal';
import { useParticipantStore } from '../../stores/participantStore';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';

const props = defineProps<{
    visible: boolean;
    meal: Meal | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'saved', attendeeIds: string[]): void;
}>();

const participantStore = useParticipantStore();
const selectedAttendees = ref<string[]>([]);

// Synchronise la sélection locale quand le repas cible change
watch(() => props.meal, (meal) => {
    selectedAttendees.value = meal ? [...(meal.attendeeIds || [])] : [];
}, { immediate: true });

const save = () => {
    emit('saved', selectedAttendees.value);
};

const close = () => {
    emit('update:visible', false);
};
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        header="Modifier les participants"
        :style="{ width: '90vw', maxWidth: '400px' }"
    >
        <div class="flex flex-col gap-4 py-4 pt-2">
            <p class="text-surface-600 dark:text-surface-400 text-sm mb-2">
                Sélectionnez les personnes présentes pour ce repas.
            </p>
            <div class="flex flex-col gap-2">
                <label for="attendees-select" class="font-semibold text-sm">Participants</label>
                <MultiSelect
                    id="attendees-wrapper"
                    name="attendees-select"
                    inputId="attendees-select"
                    v-model="selectedAttendees"
                    :options="participantStore.participants"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Sélectionner les convives"
                    class="w-full"
                    display="chip"
                />
            </div>
        </div>
        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="close" />
            <Button label="Enregistrer" icon="pi pi-check" @click="save" />
        </template>
    </Dialog>
</template>
