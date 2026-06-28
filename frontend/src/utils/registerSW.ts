export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // Only register in production to avoid caching during development
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed
      });
    });
  }
}
