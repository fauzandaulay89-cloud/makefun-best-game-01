// LUMEN HARVEST — tuning constants and palette.
// One place for every number that shapes how the game feels, so balance
// changes never touch the simulation or the drawing code.

export const VIEW = {
  width: 1280,
  height: 800,
  // The playfield is the whole canvas; the HUD lives in the top strip.
  hudHeight: 64,
};

export const PALETTE = {
  background: '#05010f',
  nebulaA: '#1b0b3a',
  nebulaB: '#07263a',
  star: '#cfe8ff',
  player: '#7df9ff',
  playerCore: '#e8feff',
  bullet: '#ffe45e',
  lumen: '#8dff5e',
  lumenCore: '#eaffd0',
  shard: '#ff5e7a',
  darter: '#ff9f43',
  spinner: '#c77dff',
  splitter: '#ff5e5e',
  mini: '#ff8fa3',
  boss: '#ff2e63',
  bossCore: '#ffd166',
  enemyBullet: '#ff6b9d',
  nova: '#b8fff1',
  text: '#eaf6ff',
  textDim: '#8fa8c8',
  gold: '#ffd166',
  danger: '#ff4d6d',
};

export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 460,
  drag: 3.2,
  fireInterval: 0.14,
  bulletSpeed: 760,
  bulletRadius: 5,
  bulletDamage: 1,
  lives: 3,
  maxLives: 5,
  // Brief mercy after a hit so one collision never costs two lives.
  invulnerableSeconds: 2.0,
  // Nova: the screen-clearing burst, charged by collecting lumen.
  novaCost: 100,
  novaRadius: 420,
  novaDamage: 3,
};

export const ENEMIES = {
  drifter: { radius: 18, hp: 1, speed: 70, score: 50, lumen: 1, color: PALETTE.shard },
  darter: { radius: 14, hp: 1, speed: 210, score: 80, lumen: 1, color: PALETTE.darter },
  spinner: { radius: 20, hp: 2, speed: 55, score: 120, lumen: 2, color: PALETTE.spinner },
  splitter: { radius: 24, hp: 3, speed: 60, score: 150, lumen: 2, color: PALETTE.splitter },
  mini: { radius: 10, hp: 1, speed: 170, score: 40, lumen: 1, color: PALETTE.mini },
  boss: { radius: 74, hp: 90, speed: 42, score: 5000, lumen: 12, color: PALETTE.boss },
};

export const WAVES = {
  // The win: clear wave 10 and the Hollow Star goes down.
  winWave: 10,
  // Seconds of calm between waves, with the banner on screen.
  breakSeconds: 3.5,
  // Spawn pacing tightens as waves climb.
  baseInterval: 1.15,
  minInterval: 0.32,
  intervalFalloff: 0.07,
  // How many enemies a wave fields before it is "cleared".
  baseCount: 6,
  countPerWave: 3,
  // +1 life every third cleared wave, up to the cap.
  healEvery: 3,
};

export const SCORING = {
  // Combo grows while the player keeps killing and collecting without
  // taking a hit; a hit resets it. Multiplier caps here.
  comboCap: 8,
  comboWindowSeconds: 4,
  lumenScore: 25,
  waveClearBonus: 250,
  novaKillScore: 25,
};

export const AUDIO = {
  masterVolume: 0.35,
};
