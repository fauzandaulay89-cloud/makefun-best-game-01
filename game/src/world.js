// The simulation: the player ship, enemies, bullets, lumen orbs, waves,
// the Hollow Star boss, collisions and scoring. Rendering lives in
// render.js; this file only moves numbers and decides what happened.

import { ENEMIES, PALETTE, PLAYER, SCORING, VIEW, WAVES } from './config.js';
import { angleTo, chance, clamp, createRng, distanceSquared, pick, range } from './random.js';

const ENEMY_KINDS = ['drifter', 'darter', 'spinner', 'splitter'];

export class World {
  constructor(sound, particles) {
    this.sound = sound;
    this.particles = particles;
    this.rng = createRng(1);
    this.reset(1);
  }

  reset(seed) {
    this.rng = createRng(seed);
    this.player = {
      x: VIEW.width / 2,
      y: VIEW.height - 140,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      fireCooldown: 0,
      invulnerable: 0,
      thrust: 0,
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.lumen = [];
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lives = PLAYER.lives;
    this.energy = 0;
    this.wave = 0;
    this.waveState = 'break';
    this.breakTimer = 1.2;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.kills = 0;
    this.shake = 0;
    this.time = 0;
    this.boss = null;
    this.bossSpawned = false;
    this.victory = false;
    this.waveBanner = '';
    this.waveBannerTimer = 0;
  }

  get multiplier() {
    return 1 + (Math.min(this.combo, SCORING.comboCap) - 1) * 0.25;
  }

  get spawnInterval() {
    return Math.max(
      WAVES.minInterval,
      WAVES.baseInterval - WAVES.intervalFalloff * (this.wave - 1),
    );
  }

  get waveTotal() {
    return WAVES.baseCount + WAVES.countPerWave * (this.wave - 1);
  }

  startWave(number) {
    this.wave = number;
    this.waveState = 'spawning';
    this.spawnQueue = this.waveTotal;
    this.spawnTimer = 0.4;
    this.bossSpawned = false;
    this.waveBanner = number === WAVES.winWave ? 'FINAL WAVE — THE HOLLOW STAR' : `WAVE ${number}`;
    this.waveBannerTimer = 2.2;
    if (number === WAVES.winWave) this.sound.bossAlarm();
    else this.sound.waveHorn();
  }

  waveMix() {
    const kinds = ['drifter'];
    if (this.wave >= 2) kinds.push('darter');
    if (this.wave >= 3) kinds.push('spinner');
    if (this.wave >= 4) kinds.push('splitter');
    return kinds;
  }

  spawnEnemy(kind, x = null, y = null) {
    const spec = ENEMIES[kind];
    const enemy = {
      kind,
      x: x ?? range(this.rng, 40, VIEW.width - 40),
      y: y ?? -30,
      vx: 0,
      vy: spec.speed * range(this.rng, 0.8, 1.25),
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      score: spec.score,
      lumen: spec.lumen,
      color: spec.color,
      t: range(this.rng, 0, Math.PI * 2),
      fireTimer: range(this.rng, 1.2, 2.4),
      spin: range(this.rng, -1.6, 1.6),
    };
    if (kind === 'darter') enemy.baseX = enemy.x;
    this.enemies.push(enemy);
    return enemy;
  }

  spawnBoss() {
    const spec = ENEMIES.boss;
    this.boss = {
      kind: 'boss',
      x: VIEW.width / 2,
      y: -90,
      vx: 0,
      vy: spec.speed,
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      score: spec.score,
      lumen: spec.lumen,
      color: spec.color,
      t: 0,
      fireTimer: 2.0,
      spin: 0.4,
      entered: false,
    };
    this.enemies.push(this.boss);
    this.bossSpawned = true;
  }

  addScore(base, x, y) {
    const gained = Math.round(base * this.multiplier);
    this.score += gained;
    if (x !== undefined) {
      this.particles.floatText(x, y, `+${gained}`, this.multiplier > 1 ? PALETTE.gold : PALETTE.text, 15);
    }
    return gained;
  }

  bumpCombo() {
    this.combo = Math.min(this.combo + 1, SCORING.comboCap);
    this.comboTimer = SCORING.comboWindowSeconds;
  }

  dropLumen(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      this.lumen.push({
        x, y,
        vx: Math.cos(angle) * range(this.rng, 40, 130),
        vy: Math.sin(angle) * range(this.rng, 40, 130) - 40,
        radius: 8,
        t: this.rng() * Math.PI * 2,
      });
    }
  }

  killEnemy(enemy, index, byNova = false) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.bumpCombo();
    this.addScore(byNova ? SCORING.novaKillScore : enemy.score, enemy.x, enemy.y);
    this.particles.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 90 : 18, enemy.kind === 'boss' ? 420 : 260);
    this.particles.ring(enemy.x, enemy.y, enemy.color, enemy.radius * 3);
    this.dropLumen(enemy.x, enemy.y, enemy.lumen);
    this.sound.enemyDown();
    if (enemy.kind === 'splitter') {
      this.spawnEnemy('mini', enemy.x - 18, enemy.y);
      this.spawnEnemy('mini', enemy.x + 18, enemy.y);
    }
    if (enemy.kind === 'boss') {
      this.boss = null;
      this.shake = 1;
      this.sound.victory();
      this.victory = true;
      this.waveState = 'cleared';
      this.breakTimer = WAVES.breakSeconds;
    }
  }

  damagePlayer() {
    if (this.player.invulnerable > 0) return;
    this.lives -= 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.energy = Math.max(0, this.energy - 30);
    this.player.invulnerable = PLAYER.invulnerableSeconds;
    this.shake = 0.9;
    this.particles.burst(this.player.x, this.player.y, PALETTE.player, 40, 340);
    this.particles.ring(this.player.x, this.player.y, PALETTE.danger, 120);
    this.sound.hurt();
  }

  fireNova() {
    if (this.energy < PLAYER.novaCost) return false;
    this.energy = 0;
    this.shake = 1;
    this.particles.ring(this.player.x, this.player.y, PALETTE.nova, PLAYER.novaRadius);
    this.particles.burst(this.player.x, this.player.y, PALETTE.nova, 50, 500);
    this.sound.nova();
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const d2 = distanceSquared(enemy.x, enemy.y, this.player.x, this.player.y);
      if (d2 <= PLAYER.novaRadius * PLAYER.novaRadius) {
        enemy.hp -= PLAYER.novaDamage;
        if (enemy.hp <= 0) this.killEnemy(enemy, i, true);
      }
    }
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      const d2 = distanceSquared(bullet.x, bullet.y, this.player.x, this.player.y);
      return d2 > PLAYER.novaRadius * PLAYER.novaRadius;
    });
    return true;
  }

  update(dt, input) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
    if (this.waveBannerTimer > 0) this.waveBannerTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    this.particles.update(dt);
    this.updatePlayer(dt, input);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateLumen(dt);
    this.updateWaves(dt);
    this.collide();
  }

  updatePlayer(dt, input) {
    const player = this.player;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    const mx = input.moveX;
    const my = input.moveY;
    const length = Math.hypot(mx, my) || 1;
    player.vx += (mx / length) * PLAYER.accel * dt * (mx || my ? 1 : 0);
    player.vy += (my / length) * PLAYER.accel * dt * (mx || my ? 1 : 0);
    player.vx *= Math.max(0, 1 - PLAYER.drag * dt);
    player.vy *= Math.max(0, 1 - PLAYER.drag * dt);
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > PLAYER.maxSpeed) {
      player.vx = (player.vx / speed) * PLAYER.maxSpeed;
      player.vy = (player.vy / speed) * PLAYER.maxSpeed;
    }
    player.x = clamp(player.x + player.vx * dt, PLAYER.radius, VIEW.width - PLAYER.radius);
    player.y = clamp(player.y + player.vy * dt, VIEW.hudHeight + PLAYER.radius, VIEW.height - PLAYER.radius);
    player.thrust = Math.min(1, speed / PLAYER.maxSpeed);
    player.angle = angleTo(player.x, player.y, input.mouseX, input.mouseY);
    if (input.firing && player.fireCooldown <= 0) {
      player.fireCooldown = PLAYER.fireInterval;
      const spread = 0.06;
      this.bullets.push({
        x: player.x + Math.cos(player.angle) * (PLAYER.radius + 6),
        y: player.y + Math.sin(player.angle) * (PLAYER.radius + 6),
        vx: Math.cos(player.angle + (this.rng() - 0.5) * spread) * PLAYER.bulletSpeed,
        vy: Math.sin(player.angle + (this.rng() - 0.5) * spread) * PLAYER.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: PLAYER.bulletDamage,
      });
      this.sound.shoot();
    }
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    this.bullets = this.bullets.filter((b) => b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);
    for (const bullet of this.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.t += dt;
      if (enemy.kind === 'boss') {
        if (!enemy.entered) {
          if (enemy.y >= 180) {
            enemy.entered = true;
            enemy.vy = 0;
          }
        } else {
          enemy.x = VIEW.width / 2 + Math.sin(enemy.t * 0.7) * 340;
          enemy.y = 180 + Math.sin(enemy.t * 1.3) * 36;
          enemy.fireTimer -= dt;
          if (enemy.fireTimer <= 0) {
            enemy.fireTimer = 2.1;
            this.bossBurst(enemy);
          }
          if (enemy.hp <= enemy.maxHp / 2 && !enemy.enraged) {
            enemy.enraged = true;
            enemy.fireTimer = 0.6;
            this.spawnEnemy('mini', enemy.x - 60, enemy.y + 40);
            this.spawnEnemy('mini', enemy.x + 60, enemy.y + 40);
          }
        }
        continue;
      }
      if (enemy.kind === 'darter') {
        enemy.x = enemy.baseX + Math.sin(enemy.t * 4) * 70;
        enemy.y += enemy.vy * dt;
      } else if (enemy.kind === 'spinner') {
        enemy.y += enemy.vy * dt;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0 && enemy.y > VIEW.hudHeight && enemy.y < VIEW.height * 0.6) {
          enemy.fireTimer = range(this.rng, 1.8, 2.6);
          const angle = angleTo(enemy.x, enemy.y, this.player.x, this.player.y);
          this.enemyBullets.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * 230,
            vy: Math.sin(angle) * 230,
            radius: 6,
          });
        }
      } else {
        enemy.y += enemy.vy * dt;
        enemy.x += Math.sin(enemy.t * 1.5) * 24 * dt;
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.y < VIEW.height + 60);
    if (this.boss && !this.enemies.includes(this.boss)) this.boss = null;
  }

  bossBurst(boss) {
    const count = boss.enraged ? 14 : 10;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + boss.t * 0.3;
      this.enemyBullets.push({
        x: boss.x, y: boss.y + boss.radius * 0.4,
        vx: Math.cos(angle) * 170,
        vy: Math.sin(angle) * 170,
        radius: 7,
      });
    }
    this.sound.blip({ frequency: 180, endFrequency: 90, duration: 0.25, type: 'sawtooth', volume: 0.12 });
  }

  updateLumen(dt) {
    for (const orb of this.lumen) {
      orb.t += dt;
      const d2 = distanceSquared(orb.x, orb.y, this.player.x, this.player.y);
      if (d2 < 130 * 130) {
        const angle = angleTo(orb.x, orb.y, this.player.x, this.player.y);
        const pull = 620 * (1 - Math.sqrt(d2) / 130);
        orb.vx += Math.cos(angle) * pull * dt;
        orb.vy += Math.sin(angle) * pull * dt;
      }
      orb.vx *= Math.max(0, 1 - 1.6 * dt);
      orb.vy *= Math.max(0, 1 - 1.6 * dt);
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt + 26 * dt;
    }
    this.lumen = this.lumen.filter((orb) => orb.y < VIEW.height + 20 && orb.x > -20 && orb.x < VIEW.width + 20);
  }

  updateWaves(dt) {
    if (this.waveState === 'break') {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.startWave(this.wave + 1);
      return;
    }
    if (this.waveState === 'spawning') {
      if (this.spawnQueue > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnTimer = this.spawnInterval;
          this.spawnQueue -= 1;
          if (this.wave === WAVES.winWave && !this.bossSpawned && this.spawnQueue === 0) {
            this.spawnBoss();
          } else {
            const kinds = this.waveMix();
            const kind = kinds[Math.floor(this.rng() * kinds.length)];
            if (chance(this.rng, 0.25)) {
              this.spawnEnemy(kind, range(this.rng, 40, VIEW.width - 40), -30);
            } else {
              this.spawnEnemy(kind);
            }
          }
        }
      } else if (this.enemies.length === 0 && !this.boss) {
        this.waveState = 'cleared';
        this.breakTimer = WAVES.breakSeconds;
        this.addScore(SCORING.waveClearBonus * this.wave);
        this.particles.floatText(VIEW.width / 2, VIEW.height / 2 - 40, `WAVE ${this.wave} CLEAR  +${SCORING.waveClearBonus * this.wave}`, PALETTE.gold, 26);
        if (this.wave % WAVES.healEvery === 0 && this.lives < PLAYER.maxLives) {
          this.lives += 1;
          this.particles.floatText(VIEW.width / 2, VIEW.height / 2 - 8, '+1 HULL', PALETTE.lumen, 20);
        }
      }
      return;
    }
    if (this.waveState === 'cleared') {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0 && !this.victory) this.startWave(this.wave + 1);
    }
  }

  collide() {
    // Player bullets against enemies.
    for (let bi = this.bullets.length - 1; bi >= 0; bi -= 1) {
      const bullet = this.bullets[bi];
      let consumed = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei -= 1) {
        const enemy = this.enemies[ei];
        const reach = bullet.radius + enemy.radius;
        if (distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y) <= reach * reach) {
          enemy.hp -= bullet.damage;
          this.particles.burst(bullet.x, bullet.y, PALETTE.bullet, 4, 160);
          if (enemy.hp <= 0) this.killEnemy(enemy, ei);
          consumed = true;
          break;
        }
      }
      if (consumed) this.bullets.splice(bi, 1);
    }
    // Enemies and their bullets against the player.
    if (this.player.invulnerable <= 0) {
      for (const enemy of this.enemies) {
        const reach = enemy.radius + PLAYER.radius - 4;
        if (distanceSquared(enemy.x, enemy.y, this.player.x, this.player.y) <= reach * reach) {
          this.damagePlayer();
          break;
        }
      }
    }
    if (this.player.invulnerable <= 0) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
        const bullet = this.enemyBullets[i];
        const reach = bullet.radius + PLAYER.radius - 4;
        if (distanceSquared(bullet.x, bullet.y, this.player.x, this.player.y) <= reach * reach) {
          this.enemyBullets.splice(i, 1);
          this.damagePlayer();
          break;
        }
      }
    }
    // Lumen against the player: collect, charge the nova, grow the combo.
    for (let i = this.lumen.length - 1; i >= 0; i -= 1) {
      const orb = this.lumen[i];
      const reach = orb.radius + PLAYER.radius + 6;
      if (distanceSquared(orb.x, orb.y, this.player.x, this.player.y) <= reach * reach) {
        this.lumen.splice(i, 1);
        this.bumpCombo();
        this.addScore(SCORING.lumenScore, orb.x, orb.y - 12);
        this.energy = Math.min(PLAYER.novaCost, this.energy + 10);
        this.particles.burst(orb.x, orb.y, PALETTE.lumen, 6, 140);
        this.sound.pickup(this.combo);
      }
    }
  }
}
