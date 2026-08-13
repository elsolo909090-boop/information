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
    const buildingsHtml = BUILDINGS.map(
      (b) => `<button class="btn btn-shop" data-type="${b.type}" data-cost="${b.cost}">${b.label}<br><small>${b.cost}💎</small></button>`
    ).join('');

    this.root.innerHTML = `
      <div class="panel-backdrop hidden" id="shopBackdrop">
        <div class="panel-card">
          <h2>Магазин</h2>
          <p>Питомцы</p>
          <button class="btn btn-shop" id="buyEggBtn">🥚 Купить яйцо питомца <br><small>5💎</small></button>
          <p>Постройки (перетащи на остров, чтобы переставить)</p>
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
    this.root.querySelectorAll('.btn-shop[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost, 10);
        const ok = this.onBuyBuilding(type, cost);
        if (!ok) alert('Недостаточно самоцветов 💎');
      });
    });
  }

  open() {
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.backdrop.classList.add('hidden');
  }
}

export { ShopPanel };
