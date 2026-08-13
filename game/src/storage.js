// storage.js — local-only persistence. No server, no network calls, no tracking.
const Storage = (() => {
  const KEY = "jumpLearnGame.v1";

  const DEFAULT_STATE = {
    settings: {
      grades: [],       // e.g. [4]
      subjects: [],      // e.g. ["math","russian"]
    },
    progress: {
      totalRubles: 0,
      solvedCount: 0,
      bySubject: {},     // { math: {solved:0, correct:0, earned:0}, russian: {...} }
    },
    // history entries: { ts, subject, class, question, answer, correct, reward }
    history: [],
    parent: {
      // no password stored; gate uses a generated arithmetic question each time
    },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // shallow-merge with defaults to survive schema additions
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        progress: { ...DEFAULT_STATE.progress, ...(parsed.progress || {}) },
      };
    } catch (e) {
      console.warn("Storage load failed, resetting", e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();

  return {
    get state() { return state; },

    getSettings() { return state.settings; },
    setSettings(settings) {
      state.settings = { ...state.settings, ...settings };
      save(state);
    },

    recordAnswer({ subject, klass, question, answer, correct, reward }) {
      if (!state.progress.bySubject[subject]) {
        state.progress.bySubject[subject] = { solved: 0, correct: 0, earned: 0 };
      }
      const bucket = state.progress.bySubject[subject];
      bucket.solved += 1;
      if (correct) bucket.correct += 1;
      bucket.earned += reward;

      state.progress.solvedCount += 1;
      state.progress.totalRubles += reward;

      state.history.push({
        ts: Date.now(),
        subject, class: klass, question, answer, correct, reward,
      });

      save(state);
    },

    getProgress() { return state.progress; },
    getHistory() { return state.history; },

    resetProgress() {
      state.progress = structuredClone(DEFAULT_STATE.progress);
      state.history = [];
      save(state);
    },

    exportHistoryJson() {
      return JSON.stringify(
        { exportedAt: new Date().toISOString(), progress: state.progress, history: state.history },
        null, 2
      );
    },
  };
})();
