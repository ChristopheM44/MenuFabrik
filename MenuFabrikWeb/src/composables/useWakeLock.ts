import { ref, onMounted, onUnmounted } from 'vue';

export function useWakeLock() {
  const isSupported = ref('wakeLock' in navigator);
  const isActive = ref(false);
  let wakeLock: WakeLockSentinel | null = null;
  let releaseHandler: (() => void) | null = null;

  const requestWakeLock = async () => {
    if (!isSupported.value) return;
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen') as WakeLockSentinel;
      isActive.value = true;
      releaseHandler = () => { isActive.value = false; };
      wakeLock.addEventListener('release', releaseHandler);
    } catch (e) {
      // Silently fail (e.g. battery saver mode)
      isActive.value = false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      if (releaseHandler) {
        wakeLock.removeEventListener('release', releaseHandler);
        releaseHandler = null;
      }
      try {
        await wakeLock.release();
      } catch (e) {
        // Silently fail
      }
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
