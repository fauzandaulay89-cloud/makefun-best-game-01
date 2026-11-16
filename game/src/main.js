// LUMEN HARVEST — boot, state machine and the frame loop.
// States: title → playing ⇄ paused → over, and playing → won.
// The world simulates; the renderer draws; this file only decides
// which screen is up and when the run starts, ends or restarts.

import { VIEW } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Particles } from './particles.js';
import { Renderer } from './render.js';
import { applyShot, shotFromUrl } from './shots.js';
import { World } from './world.js';

const BEST_KEY = 'lumen-harvest-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBank();
    this.input = new Input(canvas);
    this.particles = new Particles();
    this.renderer = new Renderer(canvas);
    this.world = new World(this.sound, this.particles);
    this.state = 'title';
    this.best = this.loadBest();
    this.isNewBest = false;
    this.time = 0;
    this.lastTimestamp = 0;
    this.shotMode = false;
  }

  loadBest() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(BEST_KEY, String(this.best));
    } catch {
      // Private mode or no storage: the score still shows this run.
    }
  }

  startRun() {
    this.sound.ensure();
    this.world.reset((Date.now() % 2147483647) || 1);
    this.world.best = this.best;
    this.state = 'playing';
    this.isNewBest = false;
  }

  endRun() {
    this.state = 'over';
    if (this.world.score > this.best) {
      this.best = this.world.score;
      this.isNewBest = true;
      this.saveBest();
    }
  }

  winRun() {
    this.state = 'won';
    if (this.world.score > this.best) {
      this.best = this.world.score;
      this.isNewBest = true;
      this.saveBest();
    }
  }

  continueEndless() {
    this.state = 'playing';
    this.world.victory = false;
    this.world.waveState = 'break';
    this.world.breakTimer = 2.5;
    this.world.waveBanner = 'ENDLESS — HOW FAR CAN YOU GO?';
    this.world.waveBannerTimer = 2.2;
  }

  update(dt) {
    const input = this.input;
    const world = this.world;
    if (input.hit('m')) this.sound.toggleMute();
    if (this.state === 'title') {
      if (input.hit('enter', ' ') || input.mousePressed) this.startRun();
      return;
    }
    if (this.state === 'playing') {
      if (input.hit('p', 'escape')) {
        this.state = 'paused';
        return;
      }
      if (input.hit('e') || input.hit('nova')) world.fireNova();
      world.update(dt, input);
      this.sound.updateMusic(dt, true);
      if (world.lives <= 0) {
        this.endRun();
        return;
      }
      if (world.victory) {
        this.winRun();
      }
      return;
    }
    if (this.state === 'paused') {
      if (input.hit('p', 'escape')) this.state = 'playing';
      return;
    }
    if (this.state === 'over') {
      if (input.hit('r', 'enter') || input.mousePressed) this.startRun();
      return;
    }
    if (this.state === 'won') {
      if (input.hit('c')) this.continueEndless();
      else if (input.hit('r', 'enter') || input.mousePressed) this.startRun();
    }
  }

  draw() {
    const { ctx } = this;
    const world = this.world;
    if (this.state === 'title') {
      this.renderer.drawBackground(this.time, this.time * 0.1);
      this.renderer.drawTitle(ctx, this.best);
      return;
    }
    this.renderer.drawWorld(ctx, world, this.time);
    this.renderer.drawHud(ctx, world, this.best);
    if (this.state === 'paused') this.renderer.drawPaused(ctx);
    else if (this.state === 'over') this.renderer.drawGameOver(ctx, world, this.best, this.isNewBest);
    else if (this.state === 'won') this.renderer.drawVictory(ctx, world, this.best, this.isNewBest);
  }

  frame(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0.016);
    this.lastTimestamp = timestamp;
    this.time += dt;
    // In shot mode the staged scene is frozen: a screenshot taken a
    // second later must show exactly the same frame.
    if (!this.shotMode) this.update(dt);
    this.draw();
    this.input.endFrame();
    window.requestAnimationFrame((next) => this.frame(next));
  }

  boot() {
    const { shot, seed } = shotFromUrl(window.location.href);
    if (shot) {
      this.shotMode = true;
      applyShot(this, shot, seed);
      // Freeze the staged scene: particles settle, nothing simulates.
      this.world.particles.update(0.25);
    }
    window.requestAnimationFrame((timestamp) => {
      this.lastTimestamp = timestamp;
      this.frame(timestamp);
    });
  }
}

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const game = new Game(canvas);
window.__lumenGame = game;
game.boot();
