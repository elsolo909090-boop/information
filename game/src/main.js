// main.js — bootstraps the app: load task bank, then wire up the UI.
(async function bootstrap() {
  try {
    await TasksBank.load("data/tasks.json");
  } catch (e) {
    console.error("Не удалось загрузить базу заданий", e);
  }
  UI.init();
})();
