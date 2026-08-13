// ui.js — screen navigation, quiz modal, stats & parent-panel rendering.
// Kept deliberately framework-free (plain DOM) so it stays easy to extend.

const UI = (() => {
  const el = (id) => document.getElementById(id);
  const screens = {
    settings: el("screen-settings"),
    game: el("screen-game"),
    stats: el("screen-stats"),
    parentGate: el("screen-parent-gate"),
    parent: el("screen-parent"),
  };

  let runnerGame = null;
  let currentTask = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 2;
  let parentGateAnswer = null;
  let parentGateNext = null;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // ---------------- Settings screen ----------------
  function buildSettingsScreen() {
    const grades = TasksBank.availableGrades();
    const subjects = TasksBank.availableSubjects();
    const saved = Storage.getSettings();

    const gradeWrap = el("grade-switcher");
    gradeWrap.innerHTML = "";
    grades.forEach((g) => {
      const btn = document.createElement("button");
      btn.textContent = `${g} класс`;
      btn.dataset.grade = g;
      if (saved.grades.includes(g)) btn.classList.add("active");
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        persistSettingsFromUI();
      });
      gradeWrap.appendChild(btn);
    });

    const subjWrap = el("subject-checkboxes");
    subjWrap.innerHTML = "";
    subjects.forEach((s) => {
      const meta = TasksBank.SUBJECT_LABELS[s] || { label: s, emoji: "📘" };
      const row = document.createElement("label");
      row.className = "checkbox-item";
      if (saved.subjects.includes(s)) row.classList.add("checked");
      row.innerHTML = `<input type="checkbox" data-subject="${s}" ${saved.subjects.includes(s) ? "checked" : ""}/>
        <span>${meta.emoji} ${meta.label}</span>`;
      row.querySelector("input").addEventListener("change", (e) => {
        row.classList.toggle("checked", e.target.checked);
        persistSettingsFromUI();
      });
      subjWrap.appendChild(row);
    });
  }

  function readSettingsFromUI() {
    const grades = [...document.querySelectorAll("#grade-switcher button.active")]
      .map((b) => Number(b.dataset.grade));
    const subjects = [...document.querySelectorAll("#subject-checkboxes input:checked")]
      .map((i) => i.dataset.subject);
    return { grades, subjects };
  }

  function persistSettingsFromUI() {
    Storage.setSettings(readSettingsFromUI());
  }

  function initSettingsHandlers() {
    el("btn-start").addEventListener("click", () => {
      const { grades, subjects } = readSettingsFromUI();
      const warning = el("settings-warning");
      if (grades.length === 0 || subjects.length === 0) {
        warning.classList.remove("hidden");
        return;
      }
      warning.classList.add("hidden");
      Storage.setSettings({ grades, subjects });
      startRun(grades, subjects);
    });

    el("btn-open-stats").addEventListener("click", () => {
      renderStats();
      showScreen("stats");
    });
    el("btn-stats-back").addEventListener("click", () => showScreen("settings"));

    el("btn-open-parent").addEventListener("click", () => {
      openParentGate(() => {
        renderParentPanel();
        showScreen("parent");
      });
    });
    el("btn-parent-gate-back").addEventListener("click", () => showScreen("settings"));
    el("btn-parent-back").addEventListener("click", () => showScreen("settings"));
  }

  // ---------------- Game screen ----------------
  function startRun(grades, subjects) {
    TasksBank.startSession(grades, subjects);
    el("money-value").textContent = Storage.getProgress().totalRubles;
    showScreen("game");

    if (runnerGame) runnerGame.destroy();
    runnerGame = RunnerGame.create(el("game-canvas-mount"), {
      onBigCube: handleBigCube,
      onSmallCubeCleared: () => {},
    });
    runnerGame.start();
  }

  function handleBigCube() {
    const task = TasksBank.nextTask();
    if (!task) { runnerGame.resume(); return; } // no tasks configured, just keep running
    currentTask = task;
    attempts = 0;
    renderTaskModal(task);
    el("task-modal").classList.remove("hidden");
  }

  function renderTaskModal(task) {
    const meta = TasksBank.SUBJECT_LABELS[task.subject] || { label: task.subject, emoji: "📘" };
    el("task-subject-badge").textContent = `${meta.emoji} ${meta.label} · ${task.class} класс`;
    el("task-question").textContent = task.question;
    el("task-feedback").classList.add("hidden");
    el("task-feedback").textContent = "";
    el("btn-skip-task").classList.add("hidden");

    const optionsWrap = el("task-options");
    optionsWrap.innerHTML = "";
    const options = TasksBank.shuffledOptions(task);
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => onAnswerSelected(opt, btn));
      optionsWrap.appendChild(btn);
    });
  }

  function onAnswerSelected(selected, btnEl) {
    const correct = selected === currentTask.answer;
    const optionButtons = [...document.querySelectorAll(".option-btn")];
    optionButtons.forEach((b) => (b.disabled = true));

    if (correct) {
      btnEl.classList.add("correct");
      const feedback = el("task-feedback");
      feedback.textContent = "Правильно! +1 ₽";
      feedback.className = "feedback ok";
      feedback.classList.remove("hidden");

      Storage.recordAnswer({
        subject: currentTask.subject, klass: currentTask.class,
        question: currentTask.question, answer: currentTask.answer,
        correct: true, reward: 1,
      });
      el("money-value").textContent = Storage.getProgress().totalRubles;

      setTimeout(() => closeTaskModal(true), 700);
    } else {
      attempts += 1;
      btnEl.classList.add("wrong");
      const feedback = el("task-feedback");

      if (attempts < MAX_ATTEMPTS) {
        feedback.textContent = "Неверно, попробуй ещё раз!";
        feedback.className = "feedback bad";
        feedback.classList.remove("hidden");
        setTimeout(() => {
          optionButtons.forEach((b) => { b.disabled = false; b.classList.remove("wrong"); });
          feedback.classList.add("hidden");
        }, 700);
      } else {
        feedback.textContent = `Правильный ответ: ${currentTask.answer}`;
        feedback.className = "feedback bad";
        feedback.classList.remove("hidden");
        el("btn-skip-task").classList.remove("hidden");
        Storage.recordAnswer({
          subject: currentTask.subject, klass: currentTask.class,
          question: currentTask.question, answer: currentTask.answer,
          correct: false, reward: 0,
        });
      }
    }
  }

  function closeTaskModal(correct) {
    el("task-modal").classList.add("hidden");
    currentTask = null;
    runnerGame.resolveBigCube(correct);
  }

  function initGameHandlers() {
    el("btn-skip-task").addEventListener("click", () => closeTaskModal(false));

    el("btn-pause").addEventListener("click", () => {
      runnerGame.pause();
      el("pause-modal").classList.remove("hidden");
    });
    el("btn-resume").addEventListener("click", () => {
      el("pause-modal").classList.add("hidden");
      runnerGame.resume();
    });
    el("btn-quit").addEventListener("click", () => {
      el("pause-modal").classList.add("hidden");
      if (runnerGame) { runnerGame.destroy(); runnerGame = null; }
      buildSettingsScreen();
      showScreen("settings");
    });

    el("btn-summary-close").addEventListener("click", () => {
      el("summary-modal").classList.add("hidden");
      showScreen("settings");
    });
  }

  // ---------------- Stats screen ----------------
  function renderStats() {
    const progress = Storage.getProgress();
    el("stats-total").innerHTML =
      `💰 Заработано: <b>${progress.totalRubles} ₽</b><br/>✅ Решено заданий: <b>${progress.solvedCount}</b>`;

    const breakdown = el("stats-breakdown");
    breakdown.innerHTML = "";
    Object.entries(progress.bySubject).forEach(([subject, stats]) => {
      const meta = TasksBank.SUBJECT_LABELS[subject] || { label: subject, emoji: "📘" };
      const row = document.createElement("div");
      row.className = "stats-row";
      row.innerHTML = `<span>${meta.emoji} ${meta.label}</span><span>${stats.correct}/${stats.solved} верно · ${stats.earned} ₽</span>`;
      breakdown.appendChild(row);
    });
    if (Object.keys(progress.bySubject).length === 0) {
      breakdown.innerHTML = `<p style="opacity:.6">Пока нет решённых заданий</p>`;
    }
  }

  // ---------------- Parent gate & panel ----------------
  function openParentGate(onSuccess) {
    const a = Phaser.Math.Between(3, 9);
    const b = Phaser.Math.Between(2, 8);
    parentGateAnswer = a + b;
    parentGateNext = onSuccess;
    el("parent-gate-question").textContent = `Сколько будет ${a} + ${b}?`;
    el("parent-gate-input").value = "";
    el("parent-gate-error").classList.add("hidden");
    showScreen("parentGate");
  }

  function initParentGateHandlers() {
    el("btn-parent-gate-submit").addEventListener("click", () => {
      const val = Number(el("parent-gate-input").value);
      if (val === parentGateAnswer) {
        parentGateNext && parentGateNext();
      } else {
        el("parent-gate-error").classList.remove("hidden");
      }
    });
  }

  function renderParentPanel() {
    const progress = Storage.getProgress();
    el("parent-summary").innerHTML =
      `💰 Всего заработано: <b>${progress.totalRubles} ₽</b><br/>✅ Решено заданий: <b>${progress.solvedCount}</b>`;
  }

  function initParentPanelHandlers() {
    el("btn-parent-export").addEventListener("click", () => {
      const json = Storage.exportHistoryJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jump-learn-history-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    el("btn-parent-reset").addEventListener("click", () => {
      if (confirm("Сбросить весь прогресс? Это действие нельзя отменить.")) {
        Storage.resetProgress();
        renderParentPanel();
      }
    });
  }

  function init() {
    buildSettingsScreen();
    initSettingsHandlers();
    initGameHandlers();
    initParentGateHandlers();
    initParentPanelHandlers();
    showScreen("settings");
  }

  return { init };
})();
