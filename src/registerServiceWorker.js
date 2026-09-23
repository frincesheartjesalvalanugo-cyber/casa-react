// Service worker registration helper for Casa Gracia's Hotel PWA
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Casa Gracia SW Registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Casa Gracia SW Registration error:', err);
        });
    });
  }
}
