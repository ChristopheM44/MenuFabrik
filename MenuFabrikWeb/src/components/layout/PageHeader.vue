<script setup lang="ts">
defineProps<{
    icon: string
    label: string
    title: string
    subtitle?: string
}>()
</script>

<template>
    <section class="flex flex-row items-end justify-between mb-8 gap-4">
        <div>
            <div class="flex items-center gap-2 mb-2 text-primary">
                <i :class="icon"></i>
                <span class="text-sm font-bold tracking-[0.1em] uppercase">{{ label }}</span>
            </div>
            <h1 class="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">{{ title }}</h1>
            <p v-if="subtitle" class="text-on-surface-variant mt-1 font-medium text-sm">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-3">
            <slot name="actions" />
        </div>
    </section>
</template>
