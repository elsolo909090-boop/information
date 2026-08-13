// main.js — bootstraps the app: load task bank, then wire up the UI.
(async function bootstrap() {
  try {
    await TasksBank.load("data/tasks.json");
  } catch (e) {
    console.error("Не удалось загрузить базу заданий", e);
  }
  UI.init();
})();

// Register the service worker so the app installs as a standalone PWA and
// keeps working offline after the first load. Safe to skip silently if
// unsupported (older browsers, or served over plain http on a LAN IP).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => {
      console.warn("Service worker registration failed", e);
    });
  });
}
