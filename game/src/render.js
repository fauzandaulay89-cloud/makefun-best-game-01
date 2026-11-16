// Everything the player sees, drawn on one canvas: the nebula and
// parallax starfield, the ship and its enemies, the HUD, and every menu
// screen. Nothing here changes the simulation; it only reads the world.

import { PALETTE, PLAYER, VIEW, WAVES } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 160; i += 1) {
      this.stars.push({
        x: Math.random() * VIEW.width,
        y: Math.random() * VIEW.height,
        size: 0.6 + Math.random() * 1.8,
        depth: 0.25 + Math.random() * 0.75,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    this.nebula = [];
    for (let i = 0; i < 7; i += 1) {
      this.nebula.push({
        x: Math.random() * VIEW.width,
        y: Math.random() * VIEW.height,
        radius: 180 + Math.random() * 260,
        hue: i % 2 === 0 ? PALETTE.nebulaA : PALETTE.nebulaB,
      });
    }
  }

  drawBackground(time, scroll) {
    const { ctx } = this;
    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const cloud of this.nebula) {
      const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
      gradient.addColorStop(0, cloud.hue);
      gradient.addColorStop(1, 'rgba(5,1,15,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(cloud.x - cloud.radius, cloud.y - cloud.radius, cloud.radius * 2, cloud.radius * 2);
    }
    for (const star of this.stars) {
      const y = (star.y + scroll * star.depth * 40) % VIEW.height;
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.4 + star.twinkle));
      ctx.globalAlpha = alpha * star.depth;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawShip(ctx, player, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (blink) ctx.globalAlpha = 0.35;
    // Engine flame, flickering with thrust.
    const flame = 14 + player.thrust * 16 + Math.sin(time * 40) * 4;
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-14 - flame, 0);
    ctx.lineTo(-14, 6);
    ctx.closePath();
    ctx.fill();
    // Hull: a dart pointing at the aim.
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-14, 13);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(4, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(ctx, enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = enemy.color;
    if (enemy.kind === 'drifter') {
      ctx.rotate(enemy.t * 0.8);
      this.polygon(ctx, enemy.radius, 4);
      ctx.fill();
    } else if (enemy.kind === 'darter') {
      ctx.rotate(Math.PI / 2 + Math.sin(enemy.t * 4) * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, enemy.radius + 6);
      ctx.lineTo(-enemy.radius, -enemy.radius);
      ctx.lineTo(0, -enemy.radius * 0.4);
      ctx.lineTo(enemy.radius, -enemy.radius);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'spinner') {
      ctx.rotate(enemy.t * 1.6);
      this.polygon(ctx, enemy.radius, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.background;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'splitter') {
      ctx.rotate(enemy.t * 0.5);
      this.polygon(ctx, enemy.radius, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'mini') {
      ctx.rotate(enemy.t * 2.2);
      this.polygon(ctx, enemy.radius, 3);
      ctx.fill();
    } else if (enemy.kind === 'boss') {
      ctx.rotate(Math.sin(enemy.t * 0.6) * 0.12);
      this.polygon(ctx, enemy.radius, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.bossCore;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.34 + Math.sin(time * 5) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.background;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (enemy.maxHp > 1 && enemy.kind !== 'boss') {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(enemy.x - 16, enemy.y - enemy.radius - 12, 32, 4);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - 16, enemy.y - enemy.radius - 12, 32 * (enemy.hp / enemy.maxHp), 4);
    }
  }

  polygon(ctx, radius, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  drawWorld(ctx, world, time) {
    this.drawBackground(time, world.time * 0.15);
    ctx.save();
    if (world.shake > 0) {
      const magnitude = world.shake * 9;
      ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    }
    // Lumen orbs, pulsing green.
    for (const orb of world.lumen) {
      const pulse = 1 + Math.sin(orb.t * 6) * 0.18;
      ctx.shadowColor = PALETTE.lumen;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.lumen;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.lumenCore;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.45 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player bullets.
    for (const bullet of world.bullets) {
      ctx.shadowColor = PALETTE.bullet;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Enemy bullets.
    for (const bullet of world.enemyBullets) {
      ctx.shadowColor = PALETTE.enemyBullet;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.enemyBullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const enemy of world.enemies) this.drawEnemy(ctx, enemy, time);
    this.drawShip(ctx, world.player, time);
    world.particles.draw(ctx);
    ctx.restore();
    // Wave banner across the middle.
    if (world.waveBannerTimer > 0 && world.waveBanner) {
      ctx.globalAlpha = Math.min(1, world.waveBannerTimer);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '700 44px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(world.waveBanner, VIEW.width / 2, VIEW.height / 2 - 60);
      ctx.globalAlpha = 1;
    }
  }

  drawHud(ctx, world, best) {
    ctx.fillStyle = 'rgba(5,1,15,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.hudHeight);
    ctx.fillStyle = 'rgba(125,249,255,0.25)';
    ctx.fillRect(0, VIEW.hudHeight - 2, VIEW.width, 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 20, 24);
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`BEST ${Math.max(best, world.score).toLocaleString('en-US')}`, 22, 48);
    // Wave.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.max(1, world.wave)} / ${WAVES.winWave}`, VIEW.width / 2, 24);
    if (world.combo > 1) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO x${world.multiplier.toFixed(2)}`, VIEW.width / 2, 48);
    }
    // Lives as little ships on the right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL', VIEW.width - 250, 24);
    for (let i = 0; i < PLAYER.maxLives; i += 1) {
      ctx.fillStyle = i < world.lives ? PALETTE.player : 'rgba(143,168,200,0.25)';
      ctx.beginPath();
      ctx.moveTo(VIEW.width - 236 + i * 30 + 12, 16);
      ctx.lineTo(VIEW.width - 236 + i * 30, 32);
      ctx.lineTo(VIEW.width - 236 + i * 30 + 12, 27);
      ctx.lineTo(VIEW.width - 236 + i * 30 + 24, 32);
      ctx.closePath();
      ctx.fill();
    }
    // Nova energy bar.
    ctx.fillStyle = world.energy >= PLAYER.novaCost ? PALETTE.nova : PALETTE.textDim;
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(world.energy >= PLAYER.novaCost ? 'NOVA [E] — READY' : 'NOVA [E]', VIEW.width - 250, 50);
    ctx.fillStyle = 'rgba(143,168,200,0.25)';
    ctx.fillRect(VIEW.width - 180, 42, 160, 12);
    ctx.fillStyle = world.energy >= PLAYER.novaCost ? PALETTE.nova : PALETTE.lumen;
    ctx.fillRect(VIEW.width - 180, 42, 160 * (world.energy / PLAYER.novaCost), 12);
    ctx.textAlign = 'left';
    // Boss health bar under the HUD, label to its left so it never
    // covers the boss itself.
    if (world.boss) {
      const boss = world.boss;
      const barWidth = 460;
      const x = (VIEW.width - barWidth) / 2 + 60;
      const y = VIEW.hudHeight + 14;
      ctx.fillStyle = 'rgba(255,46,99,0.25)';
      ctx.fillRect(x, y, barWidth, 14);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillRect(x, y, barWidth * (boss.hp / boss.maxHp), 14);
      ctx.strokeStyle = PALETTE.boss;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barWidth, 14);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('THE HOLLOW STAR', x - 12, y + 11);
      ctx.textAlign = 'left';
    }
  }

  panel(ctx, x, y, width, height) {
    ctx.fillStyle = 'rgba(8,4,28,0.88)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(125,249,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  drawTitle(ctx, best) {
    ctx.fillStyle = 'rgba(5,1,15,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.panel(ctx, 290, 130, 700, 540);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lumen;
    ctx.font = '700 64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('LUMEN HARVEST', VIEW.width / 2, 220);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '400 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Harvest the light. Break the Hollow Star.', VIEW.width / 2, 262);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 19px "Segoe UI", system-ui, sans-serif';
    const lines = [
      'Pilot the harvester with WASD or arrow keys — aim with the mouse.',
      'Hold CLICK or SPACE to fire. Collect green lumen to charge NOVA.',
      'Press E (or right-click) to unleash NOVA when the bar is full.',
      'Survive 10 waves and destroy the Hollow Star to win.',
      'A hit costs 1 hull and resets your combo. P pauses · M mutes.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 320 + i * 32));
    ctx.fillStyle = PALETTE.player;
    ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('CLICK or press ENTER to launch', VIEW.width / 2, 520);
    if (best > 0) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '400 18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`Best score: ${best.toLocaleString('en-US')}`, VIEW.width / 2, 560);
    }
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('An original arcade game — art, sound and code made for this bounty.', VIEW.width / 2, 630);
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(5,1,15,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.panel(ctx, 440, 300, 400, 200);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 380);
    ctx.font = '400 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press P or ESC to resume', VIEW.width / 2, 430);
  }

  drawGameOver(ctx, world, best, isNewBest) {
    ctx.fillStyle = 'rgba(5,1,15,0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.panel(ctx, 340, 170, 600, 460);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = '700 56px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL LOST', VIEW.width / 2, 260);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('The void keeps the light this time.', VIEW.width / 2, 305);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.width / 2, 370);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '400 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Wave reached: ${world.wave}   ·   Shards down: ${world.kills}`, VIEW.width / 2, 415);
    ctx.fillText(`Best: ${best.toLocaleString('en-US')}${isNewBest ? '  — NEW BEST!' : ''}`, VIEW.width / 2, 450);
    ctx.fillStyle = PALETTE.player;
    ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press R or CLICK to fly again', VIEW.width / 2, 530);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Tip: lumen charges NOVA — a full bar clears the screen.', VIEW.width / 2, 575);
  }

  drawVictory(ctx, world, best, isNewBest) {
    ctx.fillStyle = 'rgba(5,1,15,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.panel(ctx, 340, 150, 600, 500);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('VOID MASTER', VIEW.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('The Hollow Star is dust. The light is yours.', VIEW.width / 2, 285);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.width / 2, 350);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '400 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Best: ${best.toLocaleString('en-US')}${isNewBest ? '  — NEW BEST!' : ''}`, VIEW.width / 2, 395);
    ctx.fillStyle = PALETTE.player;
    ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press C to keep flying endless · R to restart', VIEW.width / 2, 480);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Endless waves keep coming, faster and meaner.', VIEW.width / 2, 525);
  }
}
