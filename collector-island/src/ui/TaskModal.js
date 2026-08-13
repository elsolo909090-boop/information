class TaskModal {
  constructor(rootEl, taskBank, gameState) {
    this.root = rootEl;
    this.taskBank = taskBank;
    this.gameState = gameState;
    this.onResolved = null; // callback({ correct, task })
    this.currentTask = null;
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="modal-backdrop hidden" id="taskModalBackdrop">
        <div class="modal-card">
          <div class="modal-subject" id="taskSubject"></div>
          <div class="modal-question" id="taskQuestion"></div>
          <div class="modal-options" id="taskOptions"></div>
          <input type="text" id="taskTextInput" class="task-text-input hidden" placeholder="Введи ответ" />
          <button id="taskSubmitBtn" class="btn btn-primary hidden">Ответить</button>
          <div class="modal-feedback" id="taskFeedback"></div>
        </div>
      </div>
    `;
    this.backdrop = this.root.querySelector('#taskModalBackdrop');
    this.subjectEl = this.root.querySelector('#taskSubject');
    this.questionEl = this.root.querySelector('#taskQuestion');
    this.optionsEl = this.root.querySelector('#taskOptions');
    this.textInput = this.root.querySelector('#taskTextInput');
    this.submitBtn = this.root.querySelector('#taskSubmitBtn');
    this.feedbackEl = this.root.querySelector('#taskFeedback');

    this.submitBtn.addEventListener('click', () => {
      this._checkAnswer(this.textInput.value.trim());
    });
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._checkAnswer(this.textInput.value.trim());
    });
  }

  open(task) {
    this.currentTask = task;
    this.feedbackEl.textContent = '';
    this.subjectEl.textContent = `${task.subject} · ${task.class} класс`;
    this.questionEl.textContent = task.question;
    this.optionsEl.innerHTML = '';

    if (task.options && task.options.length) {
      this.textInput.classList.add('hidden');
      this.submitBtn.classList.add('hidden');
      const shuffled = [...task.options].sort(() => Math.random() - 0.5);
      shuffled.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => this._checkAnswer(opt));
        this.optionsEl.appendChild(btn);
      });
    } else {
      this.textInput.classList.remove('hidden');
      this.submitBtn.classList.remove('hidden');
      this.textInput.value = '';
      setTimeout(() => this.textInput.focus(), 50);
    }

    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.backdrop.classList.add('hidden');
    this.currentTask = null;
  }

  _checkAnswer(given) {
    const task = this.currentTask;
    if (!task) return;
    const correct =
      normalize(given) === normalize(task.answer);

    if (correct) {
      this.feedbackEl.textContent = '✅ Верно!';
      this.feedbackEl.className = 'modal-feedback ok';
      const result = { correct: true, task };
      setTimeout(() => {
        this.close();
        if (this.onResolved) this.onResolved(result);
      }, 500);
    } else {
      this.feedbackEl.textContent = `❌ Неверно. ${this.taskBank.hint(task)}`;
      this.feedbackEl.className = 'modal-feedback bad';
      // No penalty: player may retry the same chest immediately.
    }
  }
}

function normalize(v) {
  return String(v).trim().toLowerCase();
}

export { TaskModal };
