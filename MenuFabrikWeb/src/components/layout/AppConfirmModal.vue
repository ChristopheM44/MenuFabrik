<script setup lang="ts">
import { useAppConfirm } from '../../composables/useAppConfirm';

const { state } = useAppConfirm();

const handleAccept = async () => {
    state.visible = false;
    if (state.onAccept) await state.onAccept();
};

const handleReject = async () => {
    state.visible = false;
    if (state.onReject) await state.onReject();
};
</script>

<template>
    <Teleport to="body">
        <Transition name="confirm-fade">
            <div
                v-if="state.visible"
                class="fixed inset-0 z-[200] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center px-6"
                @click.self="handleReject"
            >
                <div class="bg-surface-container-lowest w-full max-w-sm rounded-[2rem] p-8 text-center relative overflow-hidden shadow-[0_24px_48px_-12px_rgba(47,51,50,0.15)]">
                    <!-- Liseré haut -->
                    <div class="absolute top-0 left-0 w-full h-1 bg-error-container/20"></div>

                    <!-- Icône -->
                    <div class="mx-auto w-16 h-16 bg-error-container/10 rounded-full flex items-center justify-center mb-6">
                        <span
                            class="material-symbols-outlined text-error text-3xl"
                            style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;"
                        >report_problem</span>
                    </div>

                    <!-- Titre -->
                    <h3 class="font-headline font-extrabold tracking-tighter text-2xl text-on-surface mb-3">
                        {{ state.title }}
                    </h3>

                    <!-- Message -->
                    <p class="font-body text-on-surface-variant leading-relaxed px-2 mb-8">
                        {{ state.message }}
                    </p>

                    <!-- Actions -->
                    <div class="flex flex-col gap-3">
                        <button
                            @click="handleAccept"
                            class="w-full py-4 bg-error text-on-error font-headline font-bold rounded-full hover:bg-error-dim transition-colors active:scale-95 duration-200"
                        >
                            {{ state.acceptLabel }}
                        </button>
                        <button
                            @click="handleReject"
                            class="w-full py-4 bg-transparent text-on-surface-variant font-headline font-semibold rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
                        >
                            {{ state.rejectLabel }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
    transition: opacity 0.2s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
    opacity: 0;
}
</style>
