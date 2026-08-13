const TILE_W = 128;
const TILE_H = 64;
const GRID_ORIGIN = { x: 0, y: -40 };

const CHEST_TILES = [
  { gx: 0, gy: -1 },
  { gx: 1, gy: 0 },
  { gx: 0, gy: 1 },
  { gx: -1, gy: 0 },
  { gx: 0, gy: 0 },
];

const BUILDING_SLOTS = [
  { gx: -2, gy: -1 },
  { gx: 2, gy: -1 },
  { gx: -2, gy: 1 },
  { gx: 2, gy: 1 },
];

function isoToScreen(gx, gy, cx, cy) {
  return {
    x: cx + GRID_ORIGIN.x + (gx - gy) * (TILE_W / 2),
    y: cy + GRID_ORIGIN.y + (gx + gy) * (TILE_H / 2),
  };
}

class IslandScene extends Phaser.Scene {
  constructor() {
    super('IslandScene');
  }

  init(data) {
    this.gameState = data.gameState;
    this.taskBank = data.taskBank;
    this.taskModal = data.taskModal;
    this.onHudUpdate = data.onHudUpdate;
  }

  create() {
    this.cameras.main.setBackgroundColor('#5cc8e8');
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 20;
    this.center = { cx, cy };

    this.drawIslandBase(cx, cy);
    this.chestSprites = {};
    this.drawChests(cx, cy);
    this.drawBuildingSlots(cx, cy);
    this.drawExistingBuildings(cx, cy);
    this.drawPet(cx, cy);

    this.taskModal.onResolved = ({ correct, task }) => this.handleResolved(correct, task);

    this.updateHud();
  }

  drawIslandBase(cx, cy) {
    const g = this.add.graphics();
    g.fillStyle(0xe8c988, 1);
    for (let gx = -3; gx <= 3; gx++) {
      for (let gy = -3; gy <= 3; gy++) {
        const dist = Math.abs(gx) + Math.abs(gy);
        if (dist > 3) continue;
        const p = isoToScreen(gx, gy, cx, cy);
        const isGrass = dist <= 2;
        g.fillStyle(isGrass ? 0x7fc95a : 0xe8c988, 1);
        this.drawDiamond(g, p.x, p.y, TILE_W, TILE_H);
      }
    }
    g.lineStyle(1, 0x4a8f34, 0.25);
  }

  drawDiamond(g, x, y, w, h) {
    g.beginPath();
    g.moveTo(x, y - h / 2);
    g.lineTo(x + w / 2, y);
    g.lineTo(x, y + h / 2);
    g.lineTo(x - w / 2, y);
    g.closePath();
    g.fillPath();
  }

  drawChests(cx, cy) {
    const chests = this.gameState.data.chests;
    CHEST_TILES.forEach((tile, i) => {
      const p = isoToScreen(tile.gx, tile.gy, cx, cy);
      const chestState = chests[i];
      const container = this.add.container(p.x, p.y);

      const shadow = this.add.ellipse(0, 18, 46, 16, 0x000000, 0.2);
      const box = this.add.graphics();
      this.paintChest(box, chestState.opened);
      const label = this.add.text(0, -46, `#${i + 1}`, {
        fontSize: '14px',
        color: '#3b2a1a',
        fontFamily: 'sans-serif',
        backgroundColor: '#ffe9a8',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      container.add([shadow, box, label]);
      container.setSize(64, 64);
      box.setInteractive(
        new Phaser.Geom.Rectangle(-32, -32, 64, 64),
        Phaser.Geom.Rectangle.Contains
      );
      box.on('pointerdown', () => this.onChestTap(i));
      box.input.cursor = 'pointer';

      this.chestSprites[i] = { container, box };
    });
  }

  paintChest(g, opened) {
    g.clear();
    if (!opened) {
      g.fillStyle(0x8a5a2b, 1);
      g.fillRoundedRect(-26, -14, 52, 28, 6);
      g.fillStyle(0xd9a441, 1);
      g.fillRoundedRect(-26, -18, 52, 10, 6);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(0, -8, 5);
    } else {
      g.fillStyle(0x6b4423, 1);
      g.fillRoundedRect(-26, -6, 52, 20, 6);
      g.fillStyle(0xd9a441, 1);
      g.fillRoundedRect(-26, -26, 52, 12, 6);
      g.fillStyle(0xfff3c4, 1);
      g.fillCircle(-8, -2, 4);
      g.fillCircle(4, -4, 3);
      g.fillCircle(12, 0, 3);
    }
  }

  onChestTap(index) {
    const chest = this.gameState.data.chests[index];
    if (chest.opened) return;
    const { classes, subjects } = this.gameState.data.settings;
    const task = this.taskBank.next(classes, subjects);
    this._pendingChestIndex = index;
    this._pendingTask = task;
    this.taskModal.open(task);
  }

  handleResolved(correct, task) {
    if (!correct) return; // modal only resolves on correct answers
    const index = this._pendingChestIndex;
    if (index === undefined) return;

    this.gameState.openChest(index);
    this.gameState.recordHistory({ rubles: 1, subject: task.subject });
    this.gameState.data.rubles += 1;
    let gotGem = false;
    if (Math.random() < 0.2) {
      this.gameState.data.gems += 1;
      gotGem = true;
    }
    this.gameState.advanceDailyQuest(task.subject);
    if (this.gameState.data.activePetId) {
      this.gameState.feedActivePet();
    }
    this.gameState.save();

    const { box } = this.chestSprites[index];
    this.paintChest(box, true);
    this.floatText(index, gotGem ? '+1₽ +1💎' : '+1₽');

    const allOpened = this.gameState.data.chests.every((c) => c.opened);
    if (allOpened) {
      this.time.delayedCall(600, () => this.gameState.resetChestsForNewRound());
      this.time.delayedCall(650, () => this.scene.restart({
        gameState: this.gameState,
        taskBank: this.taskBank,
        taskModal: this.taskModal,
        onHudUpdate: this.onHudUpdate,
      }));
    }

    this.updateHud();
  }

  floatText(chestIndex, text) {
    const { container } = this.chestSprites[chestIndex];
    const t = this.add.text(container.x, container.y - 40, text, {
      fontSize: '18px',
      color: '#ffd23f',
      fontFamily: 'sans-serif',
      stroke: '#3b2a1a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: t.y - 40,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  drawBuildingSlots(cx, cy) {
    this.buildingSlotPositions = BUILDING_SLOTS.map((tile) =>
      isoToScreen(tile.gx, tile.gy, cx, cy)
    );
  }

  drawExistingBuildings(cx, cy) {
    this.gameState.data.buildings.forEach((b) => {
      this.renderBuilding(b);
    });
  }

  renderBuilding(b) {
    const g = this.add.graphics();
    g.setPosition(b.x, b.y);
    const colors = {
      hut: 0xc97b3f,
      tower: 0x8a6bd1,
      well: 0x6fa8dc,
      garden: 0x8fc94b,
    };
    g.fillStyle(colors[b.type] || 0xcccccc, 1);
    g.fillRoundedRect(-24, -30, 48, 40, 6);
    g.fillStyle(0x4a3320, 1);
    g.fillTriangle(-28, -30, 28, -30, 0, -56);
    g.setInteractive(
      new Phaser.Geom.Rectangle(-28, -56, 56, 86),
      Phaser.Geom.Rectangle.Contains
    );
    this.input.setDraggable(g);
    g.on('drag', (pointer, dragX, dragY) => {
      g.x = dragX;
      g.y = dragY;
    });
    g.on('dragend', () => {
      this.gameState.moveBuilding(b.id, g.x, g.y);
    });
  }

  placeNewBuilding(type, cost) {
    const slot = this.buildingSlotPositions.find((pos) => {
      return !this.gameState.data.buildings.some(
        (b) => Math.abs(b.x - pos.x) < 10 && Math.abs(b.y - pos.y) < 10
      );
    }) || this.buildingSlotPositions[0];
    const b = this.gameState.buyBuilding(type, cost, slot.x, slot.y);
    if (b) {
      this.renderBuilding(b);
      this.updateHud();
    }
    return b;
  }

  drawPet(cx, cy) {
    const petsX = cx - 220;
    const petsY = cy + 120;
    const pet = this.gameState.data.pets.find(
      (p) => p.id === this.gameState.data.activePetId
    );
    if (this.petGraphics) this.petGraphics.destroy();
    const g = this.add.graphics();
    g.setPosition(petsX, petsY);
    if (!pet) {
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeCircle(0, 0, 20);
      this.add.text(petsX, petsY + 30, 'Нет питомца', {
        fontSize: '12px',
        color: '#fff',
      }).setOrigin(0.5);
    } else {
      const size = pet.stage === 0 ? 16 : pet.stage === 1 ? 24 : 32;
      const color = pet.stage === 0 ? 0xffe066 : pet.stage === 1 ? 0xffa94d : 0xff6b6b;
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, size);
      const label = pet.stage === 0 ? 'Яйцо' : pet.stage === 1 ? 'Малыш' : 'Взрослый';
      this.add.text(petsX, petsY + size + 14, `${pet.species} · ${label}`, {
        fontSize: '12px',
        color: '#fff',
      }).setOrigin(0.5);
    }
    this.petGraphics = g;
  }

  updateHud() {
    if (this.onHudUpdate) this.onHudUpdate(this.gameState.data);
  }
}

export { IslandScene, isoToScreen };
