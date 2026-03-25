<script setup lang="ts">
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import type { Recipe } from '../../../models/Recipe';

const props = defineProps<{
    modelValue: Partial<Recipe>
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: Partial<Recipe>): void
}>();

const addIngredient = () => {
    const newRecipe = { ...props.modelValue };
    if (!newRecipe.ingredients) {
        newRecipe.ingredients = [];
    }
    newRecipe.ingredients.push({ name: '', unit: '' });
    emit('update:modelValue', newRecipe);
};

const removeIngredient = (index: number) => {
    const newRecipe = { ...props.modelValue };
    if (newRecipe.ingredients) {
        newRecipe.ingredients.splice(index, 1);
        emit('update:modelValue', newRecipe);
    }
};

const updateIngredient = () => {
    emit('update:modelValue', { ...props.modelValue });
}
</script>

<template>
    <Panel header="Ingrédients" toggleable :pt="{ root: { class: 'border border-surface-200 dark:border-[#2b2d31] rounded-xl overflow-hidden' }, header: { class: 'bg-surface-50 dark:bg-[#202126]' }, content: { class: 'bg-surface-0 dark:bg-[#191a1f]' } }">
        <div class="flex flex-col gap-2 p-2">
            <div class="flex justify-end items-center mb-2">
                <Button icon="pi pi-plus" label="Ajouter" size="small" text @click="addIngredient" />
            </div>
            
            <div v-if="modelValue.ingredients && modelValue.ingredients.length > 0" class="flex flex-col gap-3">
                <div v-for="(ingredient, index) in modelValue.ingredients" :key="index" class="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 bg-surface-100 dark:bg-[#202126] p-2 rounded-lg border border-surface-200 dark:border-[#2b2d31]">
                    <InputText v-model="ingredient.name" placeholder="Nom (ex: Farine)" class="w-full sm:flex-1 min-w-[120px]" @input="updateIngredient" />
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <input v-model.number="ingredient.quantity" type="number" step="any" placeholder="Qté" class="p-inputtext p-component w-24 flex-shrink-0" @input="updateIngredient" />
                        <InputText v-model="ingredient.unit" placeholder="Unité (g, ml...)" class="w-24 flex-shrink-0" @input="updateIngredient" />
                        <Button icon="pi pi-trash" severity="danger" text rounded @click="removeIngredient(index)" tabindex="-1" class="ml-auto sm:ml-0" aria-label="Supprimer cet ingrédient" />
                    </div>
                </div>
            </div>
            <div v-else class="text-sm text-surface-500 dark:text-surface-400 italic p-4 text-center border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                Aucun ingrédient détaillé. (Vous pourrez utiliser l'assistant IA pour les extraire automatiquement plus tard !)
            </div>
        </div>
    </Panel>
</template>
