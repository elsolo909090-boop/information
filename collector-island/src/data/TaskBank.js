class TaskBank {
  constructor() {
    this.tasks = [];
    this.usedToday = new Set();
  }

  async load(url = 'src/data/tasks.json') {
    const res = await fetch(url);
    this.tasks = await res.json();
    return this;
  }

  availableSubjects() {
    return [...new Set(this.tasks.map((t) => t.subject))];
  }

  filtered(classes, subjects) {
    return this.tasks.filter(
      (t) => classes.includes(t.class) && subjects.includes(t.subject)
    );
  }

  next(classes, subjects) {
    let pool = this.filtered(classes, subjects);
    if (pool.length === 0) pool = this.tasks; // fallback so game never dead-ends
    const fresh = pool.filter((t) => !this.usedToday.has(t.question));
    const chosen = fresh.length ? fresh : pool;
    const task = chosen[Math.floor(Math.random() * chosen.length)];
    this.usedToday.add(task.question);
    if (this.usedToday.size > pool.length) this.usedToday.clear();
    return task;
  }

  hint(task) {
    if (task.type === 'example') {
      return `Подсказка: ответ близко к ${task.answer}. Посчитай ещё раз по шагам.`;
    }
    return `Подсказка: правильный вариант начинается на «${String(
      task.answer
    ).charAt(0)}».`;
  }
}

export { TaskBank };
