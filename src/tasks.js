// tasks.js — task bank loading & session-scoped random selection without repeats.
//
// Task schema (kept intentionally simple so new subjects/types drop in with no code changes):
// { class: int, subject: string, type: "example"|"letter", question: string, answer: string, options: string[] }
//
// To add a new subject: add entries with a new `subject` value and register a label
// in SUBJECT_LABELS below. To add a new question type: add entries with a new `type`;
// the game UI already renders any type generically via `options` (multiple choice),
// so no rendering changes are required unless the new type needs a different layout.

const SUBJECT_LABELS = {
  math: { label: "Математика", emoji: "➕" },
  russian: { label: "Русский язык", emoji: "🔤" },
};

const TasksBank = (() => {
  let allTasks = [];
  let sessionPool = [];   // remaining, unseen-this-session tasks matching current filters
  let usedIds = new Set();

  async function load(url = "data/tasks.json") {
    const res = await fetch(url);
    allTasks = await res.json();
    // assign stable ids for session dedupe
    allTasks.forEach((t, i) => (t._id = i));
    return allTasks;
  }

  function availableGrades() {
    return [...new Set(allTasks.map((t) => t.class))].sort((a, b) => a - b);
  }

  function availableSubjects() {
    return [...new Set(allTasks.map((t) => t.subject))];
  }

  function startSession(grades, subjects) {
    usedIds = new Set();
    sessionPool = allTasks.filter(
      (t) => grades.includes(t.class) && subjects.includes(t.subject)
    );
  }

  // Returns a random task not yet used this session. Once exhausted, the pool
  // reshuffles (allows a long run to continue rather than dead-ending).
  function nextTask() {
    let candidates = sessionPool.filter((t) => !usedIds.has(t._id));
    if (candidates.length === 0) {
      usedIds.clear();
      candidates = sessionPool;
    }
    if (candidates.length === 0) return null;
    const task = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(task._id);
    return task;
  }

  function shuffledOptions(task) {
    const opts = [...task.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }

  return { load, availableGrades, availableSubjects, startSession, nextTask, shuffledOptions, SUBJECT_LABELS };
})();
