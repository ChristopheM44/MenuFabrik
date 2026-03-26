import { ref, onUnmounted } from 'vue';

export interface CookingTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
}

export function useCookingTimer(storageKey: string) {
  const timers = ref<CookingTimer[]>([]);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* ignore */ }
  };

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const saveToStorage = () => {
    localStorage.setItem(storageKey + '_timers', JSON.stringify(timers.value));
  };

  const loadFromStorage = () => {
    const saved = localStorage.getItem(storageKey + '_timers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CookingTimer[];
        // Only restore running timers
        timers.value = parsed.map(t => ({ ...t, isRunning: false }));
      } catch (e) { /* ignore */ }
    }
  };

  const tick = () => {
    let changed = false;
    timers.value = timers.value.map(timer => {
      if (!timer.isRunning || timer.remainingSeconds <= 0) return timer;
      const newRemaining = timer.remainingSeconds - 1;
      const isFinished = newRemaining <= 0;
      if (isFinished) {
        playBeep();
        vibrate();
      }
      changed = true;
      return { ...timer, remainingSeconds: newRemaining, isRunning: !isFinished, isFinished };
    });
    if (changed) saveToStorage();
  };

  const startTicking = () => {
    if (!intervalId) {
      intervalId = setInterval(tick, 1000);
    }
  };

  const stopTicking = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const addTimer = (id: string, label: string, seconds: number) => {
    if (timers.value.find(t => t.id === id)) return;
    timers.value.push({ id, label, totalSeconds: seconds, remainingSeconds: seconds, isRunning: false, isFinished: false });
    saveToStorage();
  };

  const startTimer = (id: string) => {
    timers.value = timers.value.map(t => t.id === id ? { ...t, isRunning: true } : t);
    startTicking();
    saveToStorage();
  };

  const pauseTimer = (id: string) => {
    timers.value = timers.value.map(t => t.id === id ? { ...t, isRunning: false } : t);
    if (!timers.value.some(t => t.isRunning)) stopTicking();
    saveToStorage();
  };

  const resetTimer = (id: string) => {
    timers.value = timers.value.map(t => t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false, isFinished: false } : t);
    if (!timers.value.some(t => t.isRunning)) stopTicking();
    saveToStorage();
  };

  const removeTimer = (id: string) => {
    timers.value = timers.value.filter(t => t.id !== id);
    if (!timers.value.some(t => t.isRunning)) stopTicking();
    saveToStorage();
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  loadFromStorage();

  onUnmounted(() => {
    stopTicking();
  });

  return { timers, addTimer, startTimer, pauseTimer, resetTimer, removeTimer, formatTime };
}
