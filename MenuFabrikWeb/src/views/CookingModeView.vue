<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import { useCookingMode } from '../composables/useCookingMode';
import type { Recipe } from '../models/Recipe';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const route = useRoute();
const router = useRouter();
const recipeStore = useRecipeStore();

const recipe = ref<Recipe | undefined>(undefined);
const isLoading = ref(true);

const {
  currentStepIndex,
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  progress,
  matchedIngredients,
  stepTimerInfos,
  hasExistingSession,
  savedSession,
  resumeSession,
  startFresh,
  goNext,
  goPrevious,
  finish,
  timerComposable,
} = useCookingMode(recipe);

const { timers, addTimer, startTimer, pauseTimer, resetTimer, formatTime } = timerComposable;

const activeTimers = computed(() => timers.value.filter(t => t.isRunning || t.isFinished));

const handleTimerClick = (timerInfo: { id: string; label: string; seconds: number }, stepIndex: number) => {
  const timerId = `step_${stepIndex}_${timerInfo.id}`;
  const existing = timers.value.find(t => t.id === timerId);
  if (!existing) {
    addTimer(timerId, timerInfo.label, timerInfo.seconds);
    startTimer(timerId);
  } else if (existing.isRunning) {
    pauseTimer(timerId);
  } else if (existing.isFinished) {
    resetTimer(timerId);
    startTimer(timerId);
  } else {
    startTimer(timerId);
  }
};

const getTimerForStep = (timerInfo: { id: string }, stepIndex: number) => {
  const timerId = `step_${stepIndex}_${timerInfo.id}`;
  return timers.value.find(t => t.id === timerId);
};

const handleFinish = () => {
  finish();
  router.back();
};

const handleBack = () => {
  finish();
  router.back();
};

onMounted(async () => {
  await recipeStore.ensureReady();
  const id = route.params.recipeId as string;
  recipe.value = recipeStore.recipes.find(r => r.id === id);
  isLoading.value = false;
  if (!recipe.value) {
    router.push('/recipes');
  }
});
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col">
    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <i class="pi pi-spin pi-spinner text-4xl text-white/50"></i>
    </div>

    <!-- Resume dialog -->
    <Dialog
      v-if="hasExistingSession"
      :visible="hasExistingSession"
      modal
      :closable="false"
      :style="{ width: '90vw', maxWidth: '400px' }"
      header="Reprendre la cuisson ?"
    >
      <p class="text-sm text-gray-600 mb-4">
        Tu étais à l'étape {{ (savedSession?.currentStepIndex ?? 0) + 1 }}/{{ totalSteps }}.
        Veux-tu reprendre où tu en étais ?
      </p>
      <div class="flex gap-3 justify-end">
        <Button label="Recommencer" severity="secondary" @click="startFresh" />
        <Button label="Reprendre" icon="pi pi-play" @click="resumeSession" />
      </div>
    </Dialog>

    <template v-if="!isLoading && recipe && !hasExistingSession">
      <!-- Header -->
      <header class="flex items-center gap-4 px-5 py-4 bg-gray-900 border-b border-white/10 shrink-0">
        <button @click="handleBack" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all">
          <i class="pi pi-times text-white text-lg"></i>
        </button>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-white/50 uppercase tracking-widest font-label mb-0.5">Mode Cuisine</p>
          <h1 class="font-headline font-bold text-white truncate text-base">{{ recipe.name }}</h1>
        </div>
        <div class="shrink-0 text-right">
          <span class="text-2xl font-headline font-bold text-white">{{ currentStepIndex + 1 }}</span>
          <span class="text-white/40 text-lg">/{{ totalSteps }}</span>
        </div>
      </header>

      <!-- Progress bar -->
      <div class="h-1 bg-gray-800 shrink-0">
        <div class="h-full bg-green-500 transition-all duration-500" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8">

        <!-- Step text -->
        <section>
          <p class="text-xs text-white/40 uppercase tracking-widest font-label mb-4">Étape {{ currentStepIndex + 1 }}</p>
          <p class="text-2xl md:text-3xl font-headline font-semibold text-white leading-relaxed">{{ currentStep }}</p>
        </section>

        <!-- Matched ingredients -->
        <section v-if="matchedIngredients.length > 0">
          <p class="text-xs text-white/40 uppercase tracking-widest font-label mb-3">Ingrédients</p>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="ingredient in matchedIngredients"
              :key="ingredient.name"
              class="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl"
            >
              <span class="text-white font-body text-base">{{ ingredient.name }}</span>
              <span v-if="ingredient.quantity || ingredient.unit" class="text-green-400 font-bold text-sm">
                {{ ingredient.quantity }}{{ ingredient.unit ? ' ' + ingredient.unit : '' }}
              </span>
            </div>
          </div>
        </section>

        <!-- Step timers -->
        <section v-if="stepTimerInfos.length > 0">
          <p class="text-xs text-white/40 uppercase tracking-widest font-label mb-3">Minuteurs</p>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="timerInfo in stepTimerInfos"
              :key="timerInfo.id"
              @click="handleTimerClick(timerInfo, currentStepIndex)"
              class="flex items-center gap-3 px-5 py-3 rounded-xl border transition-all active:scale-95 font-body text-lg"
              :class="getTimerForStep(timerInfo, currentStepIndex)?.isRunning
                ? 'bg-green-600 border-green-500 text-white'
                : getTimerForStep(timerInfo, currentStepIndex)?.isFinished
                  ? 'bg-green-900 border-green-700 text-green-300'
                  : 'bg-gray-800 border-white/20 text-white hover:bg-gray-700'"
            >
              <i class="pi pi-clock text-xl"></i>
              <span class="font-bold">
                <template v-if="getTimerForStep(timerInfo, currentStepIndex)?.isRunning">
                  {{ formatTime(getTimerForStep(timerInfo, currentStepIndex)!.remainingSeconds) }}
                </template>
                <template v-else-if="getTimerForStep(timerInfo, currentStepIndex)?.isFinished">
                  Terminé !
                </template>
                <template v-else>
                  {{ timerInfo.label }}
                </template>
              </span>
              <span class="text-sm text-white/60">
                {{ getTimerForStep(timerInfo, currentStepIndex)?.isRunning ? 'Pause' :
                   getTimerForStep(timerInfo, currentStepIndex)?.isFinished ? 'Relancer' : 'Démarrer' }}
              </span>
            </button>
          </div>
        </section>

      </main>

      <!-- Navigation -->
      <nav class="px-5 pt-5 bg-gray-900 border-t border-white/10 shrink-0" style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))">
        <!-- Active timers bar -->
        <div v-if="activeTimers.length > 0" class="flex flex-wrap gap-2 mb-4">
          <div
            v-for="timer in activeTimers"
            :key="timer.id"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body"
            :class="timer.isFinished ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-white/70'"
          >
            <i class="pi pi-clock text-xs"></i>
            <span>{{ timer.label }}: {{ timer.isFinished ? '✓' : formatTime(timer.remainingSeconds) }}</span>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            @click="goPrevious"
            :disabled="isFirstStep"
            class="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl border border-white/20 font-body font-semibold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
          >
            <i class="pi pi-arrow-left"></i>
            Précédent
          </button>

          <button
            v-if="!isLastStep"
            @click="goNext"
            class="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 font-body font-semibold text-white transition-all active:scale-95"
          >
            Suivant
            <i class="pi pi-arrow-right"></i>
          </button>

          <button
            v-else
            @click="handleFinish"
            class="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 font-body font-semibold text-white transition-all active:scale-95"
          >
            <i class="pi pi-check"></i>
            Bon appétit !
          </button>
        </div>
      </nav>
    </template>
  </div>
</template>
