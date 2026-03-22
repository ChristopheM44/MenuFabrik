<script setup lang="ts">
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';

const props = defineProps<{
    modelValue: string[]
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void
}>();

const addPreparationStep = () => {
    emit('update:modelValue', [...props.modelValue, '']);
};

const removePreparationStep = (index: number) => {
    const newSteps = [...props.modelValue];
    newSteps.splice(index, 1);
    emit('update:modelValue', newSteps);
};

const updateStep = () => {
    emit('update:modelValue', [...props.modelValue]);
}
</script>

<template>
    <Panel header="Étapes de préparation" toggleable :pt="{ root: { class: 'border border-surface-200 dark:border-[#2b2d31] rounded-xl overflow-hidden' }, header: { class: 'bg-surface-50 dark:bg-[#202126]' }, content: { class: 'bg-surface-0 dark:bg-[#191a1f]' } }">
        <div class="flex flex-col gap-2 p-2">
            <div class="flex justify-end items-center mb-2">
                <Button icon="pi pi-plus" label="Ajouter une étape" size="small" text @click="addPreparationStep" />
            </div>
            
            <div v-if="modelValue && modelValue.length > 0" class="flex flex-col gap-3">
                <div v-for="(_step, index) in modelValue" :key="index" class="flex flex-row flex-nowrap items-start gap-2 bg-surface-100 dark:bg-[#202126] p-3 rounded-lg border border-surface-200 dark:border-[#2b2d31]">
                    <div class="mt-2 font-bold text-surface-500 dark:text-surface-400 w-6 text-right shrink-0">{{ index + 1 }}.</div>
                    <Textarea v-model="modelValue[index]" rows="2" placeholder="Décrivez cette étape..." class="w-full" autoResize @input="updateStep" />
                    <Button icon="pi pi-trash" severity="danger" text rounded @click="removePreparationStep(index)" tabindex="-1" class="shrink-0 mt-1" aria-label="Supprimer cette étape" />
                </div>
            </div>
            <div v-else class="text-sm text-surface-500 dark:text-surface-400 italic p-4 text-center border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                Aucune étape de préparation. Ajoutez-en ou utilisez l'assistant IA.
            </div>
        </div>
    </Panel>
</template>
