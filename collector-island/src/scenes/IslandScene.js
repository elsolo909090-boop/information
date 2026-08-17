// Original-art coordinate space: assets/original/island.png is 1408x768.
// Chest positions are placed on the pre-drawn chest spots / empty plots in that artwork.
const ART_W = 1408;
const ART_H = 768;
const ART_CENTER = { x: ART_W / 2, y: ART_H / 2 };

const CHEST_ART_POS = [
  { x: 710, y: 135 }, // top chest
  { x: 380, y: 345 }, // left chest
  { x: 980, y: 260 }, // right chest
  { x: 1100, y: 470 }, // bottom-right chest
];
const CHEST_ART_WIDTH = 210;

const BUILDING_SLOTS = [
  { x: 500, y: 470 },
  { x: 850, y: 490 },
];

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

  preload() {
    this.load.image('island', 'assets/original/island.png');
    this.load.image('chestClosed', 'assets/sprites/chest_closed.png');
    this.load.image('chestOpen', 'assets/sprites/chest_open.png');
    this.load.image('petEgg', 'assets/sprites/pet_egg.png');
    this.load.image('petBaby', 'assets/sprites/pet_baby.png');
    this.load.image('petAdult', 'assets/sprites/pet_adult.png');
    this.load.image('foxCelebrate', 'assets/sprites/fox_celebrate.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#5cc8e8');
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.center = { cx, cy };

    this.drawIslandBackground(cx, cy);
    this.chestSprites = {};
    this.drawChests();
    this.drawBuildingSlots();
    this.drawExistingBuildings();
    this.drawPet(cx, cy);

    this.taskModal.onResolved = ({ correct, task }) => this.handleResolved(correct, task);

    this.updateHud();
  }

  // Maps a coordinate in the original 1408x768 artwork to current screen space.
  artToScreen(x, y) {
    return {
      x: this.center.cx + (x - ART_CENTER.x) * this.artScale,
      y: this.center.cy + (y - ART_CENTER.y) * this.artScale,
    };
  }

  drawIslandBackground(cx, cy) {
    const bg = this.add.image(cx, cy, 'island');
    const scale = Math.max(this.scale.width / ART_W, this.scale.height / ART_H);
    this.artScale = scale;
    bg.setScale(scale);
  }

  drawChests() {
    const chests = this.gameState.data.chests;
    CHEST_ART_POS.forEach((artPos, i) => {
      const p = this.artToScreen(artPos.x, artPos.y);
      const chestState = chests[i];
      const container = this.add.container(p.x, p.y);

      const displayW = CHEST_ART_WIDTH * this.artScale;
      const sprite = this.add.image(0, 0, chestState.opened ? 'chestOpen' : 'chestClosed');
      const scaleFactor = displayW / sprite.width;
      sprite.setScale(scaleFactor);

      const label = this.add.text(0, -displayW * 0.55, `#${i + 1}`, {
        fontSize: '13px',
        color: '#3b2a1a',
        fontFamily: 'sans-serif',
        backgroundColor: '#ffe9a8',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      container.add([sprite, label]);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.onChestTap(i));

      this.chestSprites[i] = { container, sprite, displayW };
    });
  }

  setChestTexture(index, opened) {
    const { sprite, displayW } = this.chestSprites[index];
    sprite.setTexture(opened ? 'chestOpen' : 'chestClosed');
    sprite.setScale(displayW / sprite.width);
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
      this.drawPet(this.center.cx, this.center.cy);
    }
    this.gameState.save();

    this.setChestTexture(index, true);
    this.floatText(index, gotGem ? '+1₽ +1💎' : '+1₽');
    this.celebrateFox(index);

    const allOpened = this.gameState.data.chests.every((c) => c.opened);
    if (allOpened) {
      this.time.delayedCall(700, () => this.gameState.resetChestsForNewRound());
      this.time.delayedCall(750, () => this.scene.restart({
        gameState: this.gameState,
        taskBank: this.taskBank,
        taskModal: this.taskModal,
        onHudUpdate: this.onHudUpdate,
      }));
    }

    this.updateHud();
  }

  celebrateFox(chestIndex) {
    const { container } = this.chestSprites[chestIndex];
    const fox = this.add.image(container.x, container.y - 10, 'foxCelebrate');
    fox.setScale(0.001);
    fox.setAlpha(0);
    const targetScale = (70 * this.artScale) / fox.width;
    this.tweens.add({
      targets: fox,
      scale: targetScale,
      alpha: 1,
      y: fox.y - 30,
      duration: 350,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: fox,
          alpha: 0,
          delay: 500,
          duration: 400,
          onComplete: () => fox.destroy(),
        });
      },
    });
  }

  floatText(chestIndex, text) {
    const { container } = this.chestSprites[chestIndex];
    const t = this.add.text(container.x, container.y - 60, text, {
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

  drawBuildingSlots() {
    this.buildingSlotPositions = BUILDING_SLOTS.map((pos) => this.artToScreen(pos.x, pos.y));
  }

  drawExistingBuildings() {
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
    const petsX = 90;
    const petsY = this.scale.height - 90;
    const pet = this.gameState.data.pets.find(
      (p) => p.id === this.gameState.data.activePetId
    );
    if (this.petSprite) this.petSprite.destroy();
    if (this.petLabel) this.petLabel.destroy();
    if (this.petPlaceholder) this.petPlaceholder.destroy();

    if (!pet) {
      const g = this.add.graphics();
      g.setPosition(petsX, petsY);
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeCircle(0, 0, 20);
      this.petPlaceholder = g;
      this.petLabel = this.add.text(petsX, petsY + 32, 'Нет питомца', {
        fontSize: '12px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5);
    } else {
      const texKey = pet.stage === 0 ? 'petEgg' : pet.stage === 1 ? 'petBaby' : 'petAdult';
      const targetH = pet.stage === 0 ? 60 : pet.stage === 1 ? 80 : 100;
      const sprite = this.add.image(petsX, petsY, texKey);
      sprite.setScale(targetH / sprite.height);
      this.petSprite = sprite;
      const label = pet.stage === 0 ? 'Яйцо' : pet.stage === 1 ? 'Малыш' : 'Взрослый';
      this.petLabel = this.add.text(petsX, petsY + targetH / 2 + 14, label, {
        fontSize: '12px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5);
    }
  }

  updateHud() {
    if (this.onHudUpdate) this.onHudUpdate(this.gameState.data);
  }
}

export { IslandScene };
