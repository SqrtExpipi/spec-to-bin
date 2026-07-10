import { buildId } from "./version";

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${encodeURIComponent(buildId)}`)
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("spec-to-bin:update-available"));
            }
          });
        });
      })
      .catch(() => {
        // PWA is optional. Failure should not block the app.
      });
  });
}
