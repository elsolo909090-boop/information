class Hud {
  constructor(rootEl, gameState) {
    this.root = rootEl;
    this.gameState = gameState;
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="hud-bar">
        <div class="hud-stat">💵 <span id="hudRubles">0</span> ₽</div>
        <div class="hud-stat">💎 <span id="hudGems">0</span></div>
        <div class="hud-quest">
          <span>Квест дня<span id="hudQuestTheme"></span>:</span>
          <div class="progress-track"><div class="progress-fill" id="hudQuestFill"></div></div>
          <span id="hudQuestLabel">0/5</span>
        </div>
        <div class="hud-buttons">
          <button id="btnShop" class="btn btn-small">🏪 Магазин</button>
          <button id="btnSettings" class="btn btn-small">⚙️ Настройки</button>
          <button id="btnParent" class="btn btn-small">👨‍👩‍👧 Родителям</button>
        </div>
      </div>
    `;
    this.rublesEl = this.root.querySelector('#hudRubles');
    this.gemsEl = this.root.querySelector('#hudGems');
    this.questFill = this.root.querySelector('#hudQuestFill');
    this.questLabel = this.root.querySelector('#hudQuestLabel');
    this.questTheme = this.root.querySelector('#hudQuestTheme');
  }

  update(data) {
    this.rublesEl.textContent = data.rubles;
    this.gemsEl.textContent = data.gems;
    const q = data.dailyQuest;
    const pct = Math.min(100, (q.progress / q.target) * 100);
    this.questFill.style.width = pct + '%';
    this.questLabel.textContent = `${q.progress}/${q.target}`;
    this.questTheme.textContent = q.theme ? ` (${q.theme})` : '';
  }
}

export { Hud };
