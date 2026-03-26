import { ref, onMounted, onUnmounted } from 'vue';

export function useWakeLock() {
  const isSupported = ref('wakeLock' in navigator);
  const isActive = ref(false);
  let wakeLock: WakeLockSentinel | null = null;

  const requestWakeLock = async () => {
    if (!isSupported.value) return;
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen') as WakeLockSentinel;
      isActive.value = true;
      wakeLock.addEventListener('release', () => {
        isActive.value = false;
      });
    } catch (e) {
      // Silently fail (e.g. battery saver mode)
      isActive.value = false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      isActive.value = false;
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isActive.value) {
      requestWakeLock();
    }
  };

  onMounted(() => {
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    releaseWakeLock();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return { isSupported, isActive, requestWakeLock, releaseWakeLock };
}
