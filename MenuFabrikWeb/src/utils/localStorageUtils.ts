export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: unknown) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn(`localStorage quota exceeded for key "${key}"`);
    } else {
      throw err;
    }
  }
}
