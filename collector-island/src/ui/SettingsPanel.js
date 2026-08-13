const CLASSES = [1, 2, 3, 4];
const SUBJECTS = ['Математика', 'Русский язык', 'Окружающий мир'];

class SettingsPanel {
  constructor(rootEl, gameState, onChange) {
    this.root = rootEl;
    this.gameState = gameState;
    this.onChange = onChange;
    this._build();
  }

  _build() {
    const { classes, subjects } = this.gameState.data.settings;

    const classesHtml = CLASSES.map(
      (c) => `<label class="check-item"><input type="checkbox" value="${c}" ${
        classes.includes(c) ? 'checked' : ''
      } class="classCheckbox" />${c} класс</label>`
    ).join('');

    const subjectsHtml = SUBJECTS.map(
      (s) => `<label class="check-item"><input type="checkbox" value="${s}" ${
        subjects.includes(s) ? 'checked' : ''
      } class="subjectCheckbox" />${s}</label>`
    ).join('');

    this.root.innerHTML = `
      <div class="panel-backdrop hidden" id="settingsBackdrop">
        <div class="panel-card">
          <h2>Настройки</h2>
          <p>Класс</p>
          <div class="check-grid">${classesHtml}</div>
          <p>Предметы</p>
          <div class="check-grid">${subjectsHtml}</div>
          <button class="btn btn-primary" id="saveSettingsBtn">Сохранить</button>
          <button class="btn btn-secondary" id="closeSettingsBtn">Закрыть</button>
        </div>
      </div>
    `;
    this.backdrop = this.root.querySelector('#settingsBackdrop');
    this.root.querySelector('#closeSettingsBtn').addEventListener('click', () => this.close());
    this.root.querySelector('#saveSettingsBtn').addEventListener('click', () => {
      const classes = [...this.root.querySelectorAll('.classCheckbox:checked')].map((el) =>
        parseInt(el.value, 10)
      );
      const subjects = [...this.root.querySelectorAll('.subjectCheckbox:checked')].map(
        (el) => el.value
      );
      if (classes.length === 0 || subjects.length === 0) {
        alert('Выбери хотя бы один класс и один предмет');
        return;
      }
      this.gameState.setSettings(classes, subjects);
      if (this.onChange) this.onChange();
      this.close();
    });
  }

  open() {
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.backdrop.classList.add('hidden');
  }
}

export { SettingsPanel };
