import { ref, computed, watch, type Ref } from 'vue';
import type { Recipe } from '../models/Recipe';
import { parseSteps, matchIngredientsToStep, extractTimers } from '../utils/cookingParser';
import { useWakeLock } from './useWakeLock';
import { useCookingTimer } from './useCookingTimer';
import { safeSetItem } from '../utils/localStorageUtils';

export interface CookingSession {
  recipeId: string;
  currentStepIndex: number;
  startedAt: string;
}

export function useCookingMode(recipe: Ref<Recipe | undefined>) {
  const STORAGE_KEY_PREFIX = 'menufabrik_cooking_';

  const steps = computed(() => recipe.value?.instructions ? parseSteps(recipe.value.instructions) : []);
  const storageKey = computed(() => recipe.value?.id ? `${STORAGE_KEY_PREFIX}${recipe.value.id}` : '');

  const currentStepIndex = ref(0);
  const hasExistingSession = ref(false);
  const savedSession = ref<CookingSession | null>(null);

  const wakeLock = useWakeLock();
  const timerComposable = useCookingTimer(storageKey);

  // Check for existing session
  const checkExistingSession = () => {
    if (!storageKey.value) return;
    const saved = localStorage.getItem(storageKey.value);
    if (saved) {
      try {
        const session = JSON.parse(saved) as CookingSession;
        if (session.recipeId === recipe.value?.id && session.currentStepIndex > 0) {
          savedSession.value = session;
          hasExistingSession.value = true;
        }
      } catch (e) { /* ignore */ }
    }
  };

  const persistSession = () => {
    if (!storageKey.value || !recipe.value?.id) return;
    const session: CookingSession = {
      recipeId: recipe.value.id,
      currentStepIndex: currentStepIndex.value,
      startedAt: savedSession.value?.startedAt || new Date().toISOString(),
    };
    safeSetItem(storageKey.value, JSON.stringify(session));
  };

  const clearSession = () => {
    if (storageKey.value) {
      localStorage.removeItem(storageKey.value);
      localStorage.removeItem(storageKey.value + '_timers');
    }
    hasExistingSession.value = false;
    savedSession.value = null;
  };

  const resumeSession = () => {
    if (savedSession.value) {
      currentStepIndex.value = savedSession.value.currentStepIndex;
      hasExistingSession.value = false;
    }
  };

  const startFresh = () => {
    clearSession();
    currentStepIndex.value = 0;
  };

  const currentStep = computed(() => steps.value[currentStepIndex.value] || '');
  const totalSteps = computed(() => steps.value.length);
  const isFirstStep = computed(() => currentStepIndex.value === 0);
  const isLastStep = computed(() => currentStepIndex.value === totalSteps.value - 1);
  const progress = computed(() => totalSteps.value > 0 ? ((currentStepIndex.value + 1) / totalSteps.value) * 100 : 0);

  const matchedIngredients = computed(() => {
    if (!recipe.value?.ingredients || !currentStep.value) return [];
    return matchIngredientsToStep(currentStep.value, recipe.value.ingredients);
  });

  const stepTimerInfos = computed(() => extractTimers(currentStep.value));

  const goNext = () => {
    if (!isLastStep.value) {
      currentStepIndex.value++;
    }
  };

  const goPrevious = () => {
    if (!isFirstStep.value) {
      currentStepIndex.value--;
    }
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < totalSteps.value) {
      currentStepIndex.value = index;
    }
  };

  const finish = () => {
    clearSession();
  };

  // Watch recipe to check session once recipe is loaded
  watch(() => recipe.value?.id, (newId) => {
    if (newId) {
      checkExistingSession();
    }
  }, { immediate: true });

  // Persist on step change
  watch(currentStepIndex, () => {
    persistSession();
  });

  return {
    steps,
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
    goToStep,
    finish,
    clearSession,
    wakeLock,
    timerComposable,
  };
}
