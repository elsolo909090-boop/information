class ParentPanel {
  constructor(rootEl, gameState) {
    this.root = rootEl;
    this.gameState = gameState;
    this.unlocked = false;
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="panel-backdrop hidden" id="parentBackdrop">
        <div class="panel-card">
          <div id="parentGate">
            <h2>Экран для взрослых</h2>
            <p id="parentGateQuestion"></p>
            <input type="number" id="parentGateInput" class="task-text-input" />
            <button class="btn btn-primary" id="parentGateBtn">Войти</button>
            <div id="parentGateError" class="modal-feedback bad"></div>
          </div>
          <div id="parentContent" class="hidden">
            <h2>Статистика</h2>
            <div id="parentSummary"></div>
            <h3>История по дням</h3>
            <div id="parentHistory"></div>
          </div>
          <button class="btn btn-secondary" id="closeParentBtn">Закрыть</button>
        </div>
      </div>
    `;
    this.backdrop = this.root.querySelector('#parentBackdrop');
    this.gateEl = this.root.querySelector('#parentGate');
    this.contentEl = this.root.querySelector('#parentContent');
    this.gateQuestionEl = this.root.querySelector('#parentGateQuestion');
    this.gateInput = this.root.querySelector('#parentGateInput');
    this.gateError = this.root.querySelector('#parentGateError');

    this.root.querySelector('#closeParentBtn').addEventListener('click', () => this.close());
    this.root.querySelector('#parentGateBtn').addEventListener('click', () => this._checkGate());
    this.gateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._checkGate();
    });
  }

  _newChallenge() {
    this.a = 10 + Math.floor(Math.random() * 20);
    this.b = 5 + Math.floor(Math.random() * 15);
    this.gateQuestionEl.textContent = `Реши, чтобы продолжить: ${this.a} + ${this.b} = ?`;
    this.gateInput.value = '';
    this.gateError.textContent = '';
  }

  _checkGate() {
    const val = parseInt(this.gateInput.value, 10);
    if (val === this.a + this.b) {
      this.unlocked = true;
      this.gateEl.classList.add('hidden');
      this.contentEl.classList.remove('hidden');
      this._renderStats();
    } else {
      this.gateError.textContent = 'Неверно, попробуй ещё раз.';
      this._newChallenge();
    }
  }

  _renderStats() {
    const { rubles, history } = this.gameState.data;
    const bySubjectTotal = {};
    Object.values(history).forEach((day) => {
      Object.entries(day.bySubject || {}).forEach(([subj, count]) => {
        bySubjectTotal[subj] = (bySubjectTotal[subj] || 0) + count;
      });
    });

    const summaryEl = this.root.querySelector('#parentSummary');
    summaryEl.innerHTML = `
      <p>Всего накоплено: <strong>${rubles} ₽</strong></p>
      <p>Разбивка по предметам (верных ответов):</p>
      <ul>${Object.entries(bySubjectTotal)
        .map(([s, c]) => `<li>${s}: ${c}</li>`)
        .join('') || '<li>Пока нет данных</li>'}</ul>
    `;

    const historyEl = this.root.querySelector('#parentHistory');
    const days = Object.entries(history).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    historyEl.innerHTML =
      days
        .map(
          ([day, d]) =>
            `<div class="history-row"><span>${day}</span><span>${d.rubles} ₽</span></div>`
        )
        .join('') || '<p>Пока нет истории</p>';
  }

  open() {
    this.unlocked = false;
    this.gateEl.classList.remove('hidden');
    this.contentEl.classList.add('hidden');
    this._newChallenge();
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.backdrop.classList.add('hidden');
  }
}

export { ParentPanel };
