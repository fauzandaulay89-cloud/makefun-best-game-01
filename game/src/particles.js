// Particles, shockwaves and floating score text — the juice that makes
// every hit, pickup and nova feel answered at once.

import { range } from './random.js';

export class Particles {
  constructor() {
    this.sparks = [];
    this.rings = [];
    this.texts = [];
  }

  burst(x, y, color, count, speed = 260) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.4 + Math.random() * 0.45,
        maxLife: 0.85,
        size: 2 + Math.random() * 3.5,
        color,
      });
    }
  }

  ring(x, y, color, maxRadius) {
    this.rings.push({ x, y, radius: 8, maxRadius, life: 0.5, maxLife: 0.5, color });
  }

  floatText(x, y, text, color = '#eaf6ff', size = 16) {
    this.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 1 - 2.2 * dt;
      spark.vy *= 1 - 2.2 * dt;
      spark.life -= dt;
    }
    this.sparks = this.sparks.filter((spark) => spark.life > 0);
    for (const ring of this.rings) {
      ring.radius += (ring.maxRadius - ring.radius) * dt * 6;
      ring.life -= dt;
    }
    this.rings = this.rings.filter((ring) => ring.life > 0);
    for (const text of this.texts) {
      text.y -= 42 * dt;
      text.life -= dt;
    }
    this.texts = this.texts.filter((text) => text.life > 0);
  }

  draw(ctx) {
    for (const spark of this.sparks) {
      ctx.globalAlpha = Math.max(0, spark.life / spark.maxLife);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ring of this.rings) {
      ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const text of this.texts) {
      ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
      ctx.fillStyle = text.color;
      ctx.font = `700 ${text.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  get empty() {
    return this.sparks.length === 0 && this.rings.length === 0 && this.texts.length === 0;
  }
}
