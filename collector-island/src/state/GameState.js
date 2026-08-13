// Central game state: localStorage persistence, no tracking, no network calls.
const STORAGE_KEY = 'collectorIsland.save.v1';

const DEFAULT_STATE = {
  rubles: 0,
  gems: 0,
  settings: {
    classes: [1],
    subjects: ['Математика'],
  },
  chests: buildDefaultChests(),
  dailyQuest: makeDailyQuest(),
  pets: [],
  activePetId: null,
  buildings: [], // { id, type, x, y }
  history: {}, // { 'YYYY-MM-DD': { rubles: n, bySubject: { subj: correctCount } } }
};

function buildDefaultChests() {
  return [0, 1, 2, 3, 4].map((i) => ({ id: i, opened: false }));
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function makeDailyQuest() {
  return {
    day: todayKey(),
    target: 5,
    progress: 0,
    theme: null, // subject chosen for the day, set on first task pull
    claimed: false,
  };
}

class GameState {
  constructor() {
    this.data = this.load();
    this.listeners = new Set();
    this.rotateDailyQuestIfNeeded();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed };
    } catch (e) {
      console.warn('Save corrupted, resetting', e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn(this.data));
  }

  rotateDailyQuestIfNeeded() {
    const today = todayKey();
    if (this.data.dailyQuest.day !== today) {
      this.data.dailyQuest = makeDailyQuest();
      this.data.chests = buildDefaultChests();
      this.save();
    }
  }

  addRubles(n) {
    this.data.rubles += n;
    this.recordHistory({ rubles: n });
    this.save();
  }

  addGems(n) {
    this.data.gems += n;
    this.save();
  }

  spendGems(n) {
    if (this.data.gems < n) return false;
    this.data.gems -= n;
    this.save();
    return true;
  }

  recordHistory({ rubles = 0, subject = null }) {
    const key = todayKey();
    if (!this.data.history[key]) {
      this.data.history[key] = { rubles: 0, bySubject: {} };
    }
    this.data.history[key].rubles += rubles;
    if (subject) {
      this.data.history[key].bySubject[subject] =
        (this.data.history[key].bySubject[subject] || 0) + 1;
    }
  }

  openChest(id) {
    const chest = this.data.chests.find((c) => c.id === id);
    if (chest) chest.opened = true;
    this.save();
  }

  resetChestsForNewRound() {
    this.data.chests = buildDefaultChests();
    this.save();
  }

  advanceDailyQuest(subject) {
    const q = this.data.dailyQuest;
    if (!q.theme) q.theme = subject;
    if (q.progress < q.target) q.progress += 1;
    if (q.progress >= q.target) q.claimed = true;
    this.save();
  }

  setSettings(classes, subjects) {
    this.data.settings.classes = classes;
    this.data.settings.subjects = subjects;
    this.save();
  }

  buyPetEgg(cost = 5) {
    if (!this.spendGems(cost)) return null;
    const pet = {
      id: 'pet_' + Date.now(),
      species: pickRandom(['fox', 'owl', 'turtle']),
      feedCount: 0,
      stage: 0, // 0 egg, 1 baby, 2 grown
      createdAt: Date.now(),
    };
    this.data.pets.push(pet);
    this.data.activePetId = pet.id;
    this.save();
    return pet;
  }

  feedActivePet() {
    const pet = this.data.pets.find((p) => p.id === this.data.activePetId);
    if (!pet) return null;
    pet.feedCount += 1;
    if (pet.feedCount >= 8) pet.stage = 2;
    else if (pet.feedCount >= 3) pet.stage = 1;
    this.save();
    return pet;
  }

  buyBuilding(type, cost, x, y) {
    if (!this.spendGems(cost)) return null;
    const b = { id: 'b_' + Date.now(), type, x, y };
    this.data.buildings.push(b);
    this.save();
    return b;
  }

  moveBuilding(id, x, y) {
    const b = this.data.buildings.find((b) => b.id === id);
    if (b) {
      b.x = x;
      b.y = y;
      this.save();
    }
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export { GameState, todayKey };
