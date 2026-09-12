/**
 * PAWLY Pet Hub engine — 复制到 dapp/src/petHubGame.ts
 * Phaser 3。以后加城市/室内 = 新 Scene，不要重写 App.tsx。
 */
import Phaser from "phaser";

export type HubSceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";

export type HubEvent =
  | { type: "scene"; id: HubSceneId }
  | { type: "near"; id: HubSceneId | null };

type Bus = { emit: (e: HubEvent) => void };

const W = 360;
const H = 420;

function baseUrl(): string {
  const b = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/dapp/";
  return b.endsWith("/") ? b : b + "/";
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }
  preload() {
    this.load.setPath(baseUrl());
    this.load.image("street", "pet-hub-street.jpg");
    this.load.image("hospital", "pet-hub-hospital.jpg");
    this.load.image("park", "pet-hub-park.jpg");
  }
  create() {
    this.scene.start("street");
  }
}

class WalkScene extends Phaser.Scene {
  bus!: Bus;
  bgKey: string;
  sceneId: HubSceneId;
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: { [k: string]: Phaser.Input.Keyboard.Key };
  lastNear: HubSceneId | null = null;

  constructor(key: HubSceneId, bgKey: string) {
    super(key);
    this.sceneId = key;
    this.bgKey = bgKey;
  }

  init(data: { bus?: Bus }) {
    this.bus = data.bus || { emit: () => undefined };
  }

  create() {
    this.bus.emit({ type: "scene", id: this.sceneId });
    if (this.textures.exists(this.bgKey)) {
      this.add.image(W / 2, H / 2, this.bgKey).setDisplaySize(W, H);
    } else {
      this.cameras.main.setBackgroundColor(0x102018);
    }

    this.player = this.physics.add.sprite(180, 320, undefined as unknown as string);
    const g = this.add.circle(0, 0, 11, 0x00ff9d);
    const body = this.add.circle(0, 8, 7, 0xffd27a);
    const follow = this.add.container(180, 320, [g, body]);
    this.player.setVisible(false);
    this.player.setCircle(12);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(8, 36, W - 16, H - 48);

    this.events.on("update", () => {
      follow.setPosition(this.player.x, this.player.y);
    });

    const kb = this.input.keyboard;
    this.cursors = kb!.createCursorKeys();
    this.wasd = {
      w: kb!.addKey("W"),
      a: kb!.addKey("A"),
      s: kb!.addKey("S"),
      d: kb!.addKey("D"),
    };

    if (this.sceneId === "street") {
      this.makeDoor(46, 150, "shop");
      this.makeDoor(110, 150, "hospital");
      this.makeDoor(178, 150, "shelter");
      this.makeDoor(246, 150, "hotel");
      this.makeDoor(312, 150, "groom");
      this.makeDoor(300, 360, "park");
    } else {
      this.makeDoor(180, 390, "street");
    }

    this.bus.emit({ type: "near", id: null });
  }

  makeDoor(x: number, y: number, id: HubSceneId) {
    const zone = this.add.zone(x, y, 52, 64);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => {
      if (this.lastNear !== id) {
        this.lastNear = id;
        this.bus.emit({ type: "near", id });
      }
    });
  }

  update() {
    if (!this.player) return;
    const sp = 160;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.a.isDown) vx = -sp;
    if (this.cursors.right.isDown || this.wasd.d.isDown) vx = sp;
    if (this.cursors.up.isDown || this.wasd.w.isDown) vy = -sp;
    if (this.cursors.down.isDown || this.wasd.s.isDown) vy = sp;
    this.player.setVelocity(vx, vy);
  }
}

export function startPetHubGame(parent: HTMLElement, bus: Bus): Phaser.Game {
  const mk = (id: HubSceneId, bg: string) => new WalkScene(id, bg);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#070b10",
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [
      new BootScene(),
      mk("street", "street"),
      mk("hospital", "hospital"),
      mk("park", "park"),
      mk("shop", "street"),
      mk("shelter", "street"),
      mk("hotel", "street"),
      mk("groom", "street"),
    ],
    audio: { noAudio: true },
  });
  game.scene.start("boot", { bus });
  game.registry.set("bus", bus);
  game.events.once(Phaser.Core.Events.READY, () => {
    const boot = game.scene.getScene("boot") as BootScene;
    boot.scene.start("street", { bus });
  });
  return game;
}

export function goScene(game: Phaser.Game, id: HubSceneId, bus: Bus) {
  const live = game.scene.getScenes(true);
  live.forEach((s) => game.scene.stop(s.scene.key));
  game.scene.start(id, { bus });
}

export function nudgePlayer(game: Phaser.Game, dx: number, dy: number) {
  const live = game.scene.getScenes(true)[0] as WalkScene | undefined;
  if (live && live.player) {
    live.player.x = Phaser.Math.Clamp(live.player.x + dx, 16, W - 16);
    live.player.y = Phaser.Math.Clamp(live.player.y + dy, 40, H - 24);
  }
}
