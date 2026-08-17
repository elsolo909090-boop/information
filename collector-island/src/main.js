import { GameState } from './state/GameState.js';
import { TaskBank } from './data/TaskBank.js';
import { TaskModal } from './ui/TaskModal.js';
import { Hud } from './ui/Hud.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { ParentPanel } from './ui/ParentPanel.js';
import { IslandScene } from './scenes/IslandScene.js';

async function boot() {
  const gameState = new GameState();
  const taskBank = await new TaskBank().load('src/data/tasks.json');

  const hud = new Hud(document.getElementById('hudRoot'), gameState);
  const taskModal = new TaskModal(document.getElementById('modalRoot'), taskBank, gameState);

  const shopPanel = new ShopPanel(
    document.getElementById('shopRoot'),
    gameState,
    (type, cost) => {
      const scene = game.scene.getScene('IslandScene');
      const b = scene.placeNewBuilding(type, cost);
      return !!b;
    },
    (species, cost) => {
      const pet = gameState.buyPetEgg(species, cost);
      if (pet) {
        const scene = game.scene.getScene('IslandScene');
        scene.drawPet(scene.center.cx, scene.center.cy);
        hud.update(gameState.data);
      }
      return pet;
    }
  );

  const settingsPanel = new SettingsPanel(document.getElementById('settingsRoot'), gameState, () => {
    game.scene.getScene('IslandScene').scene.restart({
      gameState,
      taskBank,
      taskModal,
      onHudUpdate: (data) => hud.update(data),
    });
  });

  const parentPanel = new ParentPanel(document.getElementById('parentRoot'), gameState);

  document.getElementById('btnShopWrapper');
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnShop') shopPanel.open();
    if (e.target.id === 'btnSettings') settingsPanel.open();
    if (e.target.id === 'btnParent') parentPanel.open();
  });

  const config = {
    type: Phaser.AUTO,
    parent: 'gameCanvas',
    width: Math.min(window.innerWidth, 900),
    height: Math.min(window.innerHeight - 64, 640),
    backgroundColor: '#5cc8e8',
    scene: [IslandScene],
    input: { activePointers: 2 },
  };

  const game = new Phaser.Game(config);
  game.scene.start('IslandScene', {
    gameState,
    taskBank,
    taskModal,
    onHudUpdate: (data) => hud.update(data),
  });

  gameState.onChange((data) => hud.update(data));
  hud.update(gameState.data);

  window.addEventListener('resize', () => {
    game.scale.resize(Math.min(window.innerWidth, 900), Math.min(window.innerHeight - 64, 640));
  });
}

boot();
