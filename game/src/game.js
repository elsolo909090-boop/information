// game.js — Phaser runner scene. Pure gameplay/visuals; quiz logic lives in ui.js,
// wired together through the callbacks passed into RunnerGame.create().

const CUBE_COLORS = [0x6fd6c7, 0xf2a45e, 0xf4d35e, 0xb79ae0];
const BIG_CUBE_INTERVAL = 4; // every Nth cube is an obstacle with a quiz
const CUBE_GAP = 150;
const SCROLL_SPEED = 210; // px/sec

class RunnerScene extends Phaser.Scene {
  constructor() {
    super("RunnerScene");
  }

  init(data) {
    this.onBigCube = data.onBigCube;     // called when a big cube reaches the player
    this.onSmallCubeCleared = data.onSmallCubeCleared || (() => {});
    this.onSceneReady = data.onSceneReady;
  }

  create() {
    const { width, height } = this.scale;
    this.groundY = height * 0.72;
    this.characterX = width * 0.28;
    this.running = false;
    this.cubeIndex = 0;
    this.cubes = [];

    // sky decoration
    this.add.rectangle(width / 2, 0, width, height, 0xbfe9f2).setOrigin(0.5, 0).setDepth(-10);
    this.sun = this.add.circle(width * 0.82, height * 0.18, 40, 0xfff2c2).setDepth(-9);

    this.groundLine = this.add.rectangle(0, this.groundY + 4, width * 4, 6, 0xffffff, 0.5)
      .setOrigin(0, 0).setDepth(-1);

    // character container: body + face, simple vector shape (no external art needed)
    this.character = this.add.container(this.characterX, this.groundY);
    const body = this.add.ellipse(0, -28, 56, 56, 0x3fb6a8);
    const belly = this.add.ellipse(0, -14, 34, 30, 0xdff5ef);
    const earL = this.add.ellipse(-20, -54, 16, 16, 0xf2a45e);
    const earR = this.add.ellipse(20, -54, 16, 16, 0xf2a45e);
    const eyeL = this.add.circle(-10, -34, 4, 0x2c3e50);
    const eyeR = this.add.circle(10, -34, 4, 0x2c3e50);
    const mouth = this.add.arc(0, -22, 8, 0, 180, false, 0x2c3e50).setStrokeStyle(2, 0x2c3e50);
    this.character.add([body, earL, earR, belly, eyeL, eyeR, mouth]);
    this.character.setDepth(5);

    // seed initial cubes across the screen
    let spawnX = width * 0.6;
    while (spawnX < width * 2.5) {
      spawnX = this.spawnCube(spawnX);
    }

    this.input.on("pointerdown", () => this.hopCharacter());

    if (this.onSceneReady) this.onSceneReady(this);
  }

  spawnCube(afterX) {
    this.cubeIndex += 1;
    const isBig = this.cubeIndex % BIG_CUBE_INTERVAL === 0;
    const w = isBig ? 78 : 54;
    const h = isBig ? Phaser.Math.Between(110, 140) : Phaser.Math.Between(44, 78);
    const x = afterX + CUBE_GAP;
    const color = Phaser.Utils.Array.GetRandom(CUBE_COLORS);

    const rect = this.add.rectangle(x, this.groundY, w, h, color)
      .setOrigin(0.5, 1)
      .setStrokeStyle(3, 0xffffff, 0.6);

    let marker = null;
    if (isBig) {
      rect.setStrokeStyle(4, 0xffffff, 0.95);
      marker = this.add.text(x, this.groundY - h - 18, "?", {
        fontSize: "28px", fontStyle: "bold", color: "#2c3e50",
      }).setOrigin(0.5).setDepth(4);
    }

    this.cubes.push({ x, w, h, isBig, triggered: false, rect, marker, index: this.cubeIndex });
    return x;
  }

  hopCharacter() {
    if (this.character.isHopping) return;
    this.character.isHopping = true;
    this.tweens.add({
      targets: this.character,
      y: this.groundY - 46,
      duration: 190,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => { this.character.isHopping = false; },
    });
  }

  bigHop(onDone) {
    this.character.isHopping = true;
    this.tweens.add({
      targets: this.character,
      y: this.groundY - 70,
      duration: 260,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.character.isHopping = false;
        if (onDone) onDone();
      },
    });
  }

  stumble() {
    this.tweens.add({
      targets: this.character,
      angle: { from: 0, to: -12 },
      duration: 90,
      yoyo: true,
    });
  }

  startRunning() { this.running = true; }
  stopRunning() { this.running = false; }

  update(time, delta) {
    if (!this.running) return;
    const dx = (SCROLL_SPEED * delta) / 1000;
    const { width } = this.scale;

    for (const cube of this.cubes) {
      cube.x -= dx;
      cube.rect.x = cube.x;
      if (cube.marker) cube.marker.x = cube.x;

      if (!cube.triggered && cube.isBig && cube.x <= this.characterX + 20) {
        cube.triggered = true;
        this.stopRunning();
        this.onBigCube(cube);
      } else if (!cube.triggered && !cube.isBig && cube.x <= this.characterX) {
        cube.triggered = true;
        this.onSmallCubeCleared(cube);
      }
    }

    // recycle offscreen cubes & spawn ahead
    while (this.cubes.length && this.cubes[0].x < -100) {
      const gone = this.cubes.shift();
      gone.rect.destroy();
      if (gone.marker) gone.marker.destroy();
    }
    const last = this.cubes[this.cubes.length - 1];
    if (last && last.x < width * 2) {
      this.spawnCube(last.x);
    }
  }
}

const RunnerGame = (() => {
  let phaserGame = null;
  let scene = null;

  function create(mountEl, callbacks) {
    scene = null;
    let pendingQueue = [];
    const runOrQueue = (fn) => { if (scene) fn(scene); else pendingQueue.push(fn); };

    const rect = mountEl.getBoundingClientRect();
    const config = {
      type: Phaser.AUTO,
      parent: mountEl,
      width: rect.width,
      height: rect.height,
      transparent: true,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [RunnerScene],
      physics: { default: undefined },
    };
    phaserGame = new Phaser.Game(config);
    phaserGame.scene.start("RunnerScene", {
      ...callbacks,
      onSceneReady: (readyScene) => {
        scene = readyScene;
        pendingQueue.forEach((fn) => fn(scene));
        pendingQueue = [];
      },
    });

    const onResize = () => {
      const r = mountEl.getBoundingClientRect();
      phaserGame.scale.resize(r.width, r.height);
    };
    window.addEventListener("resize", onResize);
    phaserGame.events.once("destroy", () => window.removeEventListener("resize", onResize));

    return {
      start: () => runOrQueue((s) => s.startRunning()),
      pause: () => runOrQueue((s) => s.stopRunning()),
      resume: () => runOrQueue((s) => s.startRunning()),
      resolveBigCube: (correct) => runOrQueue((s) => {
        if (correct) {
          s.bigHop(() => s.startRunning());
        } else {
          s.stumble();
          s.startRunning();
        }
      }),
      destroy: () => { phaserGame.destroy(true); phaserGame = null; scene = null; },
    };
  }

  return { create };
})();
