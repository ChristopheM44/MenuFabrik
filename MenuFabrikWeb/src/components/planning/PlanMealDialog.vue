<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMealStore } from '../../stores/mealStore';
import { useParticipantStore } from '../../stores/participantStore';
import type { Meal } from '../../models/Meal';
import { MealStatus, MealTime } from '../../models/Meal';

// PrimeVue
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const mealStore = useMealStore();
const participantStore = useParticipantStore();
const toast = useToast();

// Helper
const getLocalISODate = (date: Date): string => {
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().split('T')[0];
    return localISOTime as string;
};

const isPlanning = ref(false);
const planStartDate = ref(new Date());
const planDaysOptions = [
    { label: '1 Jour', value: 1 },
    { label: '3 Jours', value: 3 },
    { label: '5 Jours', value: 5 },
    { label: '1 Semaine', value: 7 },
    { label: '2 Semaines', value: 14 }
];
const planNumDays = ref(3);
const planAttendees = ref<string[]>([]); // Liste des ID sélectionnés

// Initialiser les participants à l'ouverture de la modale
watch(() => props.visible, (newVal) => {
    if (newVal) {
        planStartDate.value = new Date();
        planAttendees.value = participantStore.participants.filter(p => p.isActive).map(p => p.id as string);
    }
});

const closeDialog = () => {
    emit('update:visible', false);
};

const planEmptyMeals = async () => {
    isPlanning.value = true;
    try {
        const mealsToProcess: Meal[] = [];
        const start = new Date(planStartDate.value);
        start.setHours(0, 0, 0, 0);

        for (let i = 0; i < planNumDays.value; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateStr = getLocalISODate(currentDate);

            for (const type of [MealTime.LUNCH, MealTime.DINNER]) {
                let existingMeal = mealStore.meals.find(m => {
                    let mdObj = new Date(m.date);
                    if (isNaN(mdObj.getTime())) return false;
                    const mDate = getLocalISODate(mdObj);
                    return mDate === dateStr && m.type === type;
                });

                if (!existingMeal) {
                    mealsToProcess.push({
                        date: dateStr,
                        type: type,
                        status: MealStatus.PLANNED,
                        attendeeIds: [...planAttendees.value],
                        selectedSideDishIds: []
                    });
                }
            }
        }

        if (mealsToProcess.length > 0) {
            await mealStore.saveMealsBatch(mealsToProcess);
        }

        closeDialog();

    } catch (e) {
        console.error("Erreur Planification:", e);
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue lors de la planification.', life: 3000 });
    } finally {
        isPlanning.value = false;
    }
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="Planifier les Jours"
        :style="{ width: '90vw', maxWidth: '450px' }">
        <div class="flex flex-col gap-4 py-4 pt-2">
            <p class="text-surface-600 dark:text-surface-400 text-sm mb-2">
                Ajoutez des emplacements vides dans votre agenda. Vous pourrez ensuite générer des recettes selon les
                personnes présentes.
            </p>

            <div class="flex flex-col gap-2">
                <label for="plan-start-date" class="font-semibold text-sm">À partir du</label>
                <DatePicker id="plan-start-date-wrapper" name="plan-start-date" inputId="plan-start-date"
                    v-model="planStartDate" dateFormat="dd/mm/yy" class="w-full" showIcon />
            </div>

            <div class="flex flex-col gap-2">
                <label for="plan-days" class="font-semibold text-sm">Pendant</label>
                <Select id="plan-days-wrapper" name="plan-days" inputId="plan-days" v-model="planNumDays"
                    :options="planDaysOptions" optionLabel="label" optionValue="value" class="w-full" />
            </div>

            <div class="flex flex-col gap-2">
                <label for="plan-attendees" class="font-semibold text-sm">Participants (Général)</label>
                <MultiSelect id="plan-attendees-wrapper" name="plan-attendees" inputId="plan-attendees"
                    v-model="planAttendees" :options="participantStore.participants" optionLabel="name" optionValue="id"
                    placeholder="Sélectionner les convives" class="w-full" display="chip" />
            </div>
        </div>

        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="closeDialog" />
            <Button label="Ajouter à l'agenda" icon="pi pi-calendar-plus" @click="planEmptyMeals"
                :loading="isPlanning" />
        </template>
    </Dialog>
</template>
