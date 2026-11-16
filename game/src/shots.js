// Deterministic screenshot staging: ?shot=start|play|boss|end (with an
// optional &seed=N) drops the game into a fixed, populated scene so the
// screenshots are real renders of the game's own code, identical on
// every run. Live play never uses this path.

import { ENEMIES, VIEW } from './config.js';
import { createRng, range } from './random.js';

export function applyShot(game, shot, seed) {
  const world = game.world;
  const rng = createRng(seed);
  if (shot === 'start') {
    game.state = 'title';
    return;
  }
  if (shot === 'play') {
    game.state = 'playing';
    world.reset(seed);
    world.wave = 4;
    world.waveState = 'spawning';
    world.spawnQueue = 8;
    world.score = 12840;
    world.combo = 5;
    world.comboTimer = 3;
    world.energy = 78;
    world.lives = 3;
    world.waveBanner = 'WAVE 4';
    world.waveBannerTimer = 1.6;
    world.player.x = VIEW.width / 2 - 60;
    world.player.y = VIEW.height - 220;
    world.player.angle = -Math.PI / 2.4;
    const kinds = ['drifter', 'darter', 'spinner', 'splitter'];
    for (let i = 0; i < 9; i += 1) {
      const kind = kinds[i % kinds.length];
      const enemy = world.spawnEnemy(kind, range(rng, 80, VIEW.width - 80), range(rng, 140, 420));
      enemy.t = rng() * 6;
    }
    for (let i = 0; i < 7; i += 1) {
      world.lumen.push({
        x: range(rng, 120, VIEW.width - 120),
        y: range(rng, 300, 620),
        vx: 0, vy: 0, radius: 8, t: rng() * 6,
      });
    }
    for (let i = 0; i < 5; i += 1) {
      world.bullets.push({
        x: range(rng, 200, VIEW.width - 200),
        y: range(rng, 300, 600),
        vx: 0, vy: -760, radius: 5, damage: 1,
      });
    }
    world.particles.burst(620, 300, '#ff5e7a', 22, 260);
    world.particles.burst(430, 420, '#8dff5e', 14, 200);
    return;
  }
  if (shot === 'boss') {
    game.state = 'playing';
    world.reset(seed);
    world.wave = 10;
    world.waveState = 'spawning';
    world.spawnQueue = 0;
    world.score = 48250;
    world.combo = 7;
    world.comboTimer = 3;
    world.energy = 100;
    world.lives = 2;
    world.waveBanner = 'FINAL WAVE — THE HOLLOW STAR';
    world.waveBannerTimer = 1.6;
    world.spawnBoss();
    const boss = world.boss;
    boss.y = 180;
    boss.entered = true;
    boss.hp = 58;
    boss.t = 1.2;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      world.enemyBullets.push({
        x: boss.x + Math.cos(angle) * 90,
        y: boss.y + Math.sin(angle) * 90,
        vx: Math.cos(angle) * 170,
        vy: Math.sin(angle) * 170,
        radius: 7,
      });
    }
    world.spawnEnemy('mini', boss.x - 140, boss.y + 90);
    world.spawnEnemy('mini', boss.x + 140, boss.y + 90);
    world.player.x = VIEW.width / 2;
    world.player.y = VIEW.height - 180;
    world.player.angle = -Math.PI / 2;
    world.particles.burst(boss.x, boss.y, '#ff2e63', 30, 300);
    return;
  }
  if (shot === 'end') {
    game.state = 'over';
    world.reset(seed);
    world.score = 24310;
    world.wave = 6;
    world.kills = 87;
    world.lives = 0;
    game.best = Math.max(game.best, 24310);
    game.isNewBest = false;
    return;
  }
  if (shot === 'win') {
    game.state = 'won';
    world.reset(seed);
    world.score = 68400;
    world.wave = 10;
    world.kills = 214;
    game.best = Math.max(game.best, 68400);
    game.isNewBest = true;
    return;
  }
}

export function shotFromUrl(url) {
  const params = new URLSearchParams(url.split('?')[1] ?? '');
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') ?? '1', 10);
  return { shot, seed: Number.isFinite(seed) ? seed : 1 };
}

export const ENEMY_SPEC = ENEMIES;
