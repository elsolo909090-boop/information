const BUILDINGS = [
  { type: 'hut', label: '🏠 Хижина', cost: 3 },
  { type: 'tower', label: '🗼 Башня', cost: 6 },
  { type: 'well', label: '⛲ Колодец', cost: 4 },
  { type: 'garden', label: '🌷 Сад', cost: 2 },
];

class ShopPanel {
  constructor(rootEl, gameState, onBuyBuilding, onBuyEgg) {
    this.root = rootEl;
    this.gameState = gameState;
    this.onBuyBuilding = onBuyBuilding;
    this.onBuyEgg = onBuyEgg;
    this._build();
  }

  _build() {
    const buildingsHtml = this._buildingsHtml();

    this.root.innerHTML = `
      <div class="panel-backdrop hidden" id="shopBackdrop">
        <div class="panel-card">
          <h2>Магазин</h2>
          <p>Питомцы</p>
          <button class="btn btn-shop" id="buyEggBtn">🥚 Купить яйцо питомца <br><small>5💎</small></button>
          <p>Постройки (занимают отведённое место на острове)</p>
          <div class="shop-grid">${buildingsHtml}</div>
          <button class="btn btn-secondary" id="closeShopBtn">Закрыть</button>
        </div>
      </div>
    `;
    this.backdrop = this.root.querySelector('#shopBackdrop');
    this.root.querySelector('#closeShopBtn').addEventListener('click', () => this.close());
    this.root.querySelector('#buyEggBtn').addEventListener('click', () => {
      const pet = this.onBuyEgg();
      if (!pet) alert('Недостаточно самоцветов 💎');
    });
    this.root.querySelector('.shop-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-shop[data-type]');
      if (!btn || btn.disabled) return;
      const type = btn.dataset.type;
      const cost = parseInt(btn.dataset.cost, 10);
      const ok = this.onBuyBuilding(type, cost);
      if (!ok) alert('Недостаточно самоцветов 💎');
      else this._refreshBuildings();
    });
  }

  _buildingsHtml() {
    const owned = new Set(this.gameState.data.buildings.map((b) => b.type));
    return BUILDINGS.map((b) => {
      const isOwned = owned.has(b.type);
      return `<button class="btn btn-shop" data-type="${b.type}" data-cost="${b.cost}" ${isOwned ? 'disabled' : ''}>${b.label}<br><small>${isOwned ? 'Куплено' : b.cost + '💎'}</small></button>`;
    }).join('');
  }

  _refreshBuildings() {
    this.root.querySelector('.shop-grid').innerHTML = this._buildingsHtml();
  }

  open() {
    this._refreshBuildings();
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.backdrop.classList.add('hidden');
  }
}

export { ShopPanel };
