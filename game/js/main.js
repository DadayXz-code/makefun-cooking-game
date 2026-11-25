// main.js — boots Dapur Kilat: the loop, the input, and the demo scenes.
// One clear job: wiring. It owns the canvas, the animation frame, mouse and
// keyboard input, and the ?demo= scenes the maker uses for screenshots.
// The rules live in kitchen.js, the pictures in render.js, the sounds in
// audio.js and the menu in recipes.js.

import { INGREDIENTS, recipeById } from './recipes.js';
import { KitchenGame, SHIFT_SECONDS } from './kitchen.js';
import { SoundEngine } from './audio.js';
import { VIEW_W, VIEW_H, layout, renderGame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const sound = new SoundEngine();
const game = new KitchenGame(sound);
game.muted = false;

// Handle for headless play tests: window.__dapurKilat.game exposes the model.
window.__dapurKilat = { game, sound, version: '1.0.0' };

// ---------- demo scenes (real game states, for screenshots) ----------
// ?demo=play  — mid-shift: 3 tickets, a dish half-built, one item sizzling
// ?demo=rush  — final seconds: 4 tickets, one nearly expired, plate complete
// ?demo=serve — the serve moment: full plate, coin popup, combo x3
// ?demo=menu  — the title screen (the default)
function loadDemoScene(name) {
  game.phase = 'playing';
  game.score = 0;
  game.coins = 0;
  game.served = 0;
  game.combo = 0;
  game.hearts = 3;
  game.level = 1;
  game.orders = [];
  game.board = [];
  game.plate = [];
  game.popups = [];
  game.particles = [];
  game.orderTimer = 9999; // demo scenes do not spawn new tickets
  game.elapsed = 0;
  game.rush = false;
  const ticket = (id, patience, max) => ({
    id,
    recipe: recipeById(id),
    patience,
    maxPatience: max,
    born: 0,
  });
  if (name === 'play') {
    game.score = 320;
    game.coins = 320;
    game.served = 4;
    game.combo = 2;
    game.level = 2;
    game.timeLeft = 92;
    game.orders = [
      ticket('nasi-goreng', 34, 42),
      ticket('mie-ayam', 22, 38),
      ticket('sayur-telur', 12, 42),
    ];
    game.board = [
      { id: 1, ingredientId: 'ayam', progress: 0.55, ready: false },
      { id: 2, ingredientId: 'telur', progress: 1, ready: true },
    ];
    game.plate = ['nasi', 'sambal'];
  } else if (name === 'rush') {
    game.score = 1240;
    game.coins = 1240;
    game.served = 14;
    game.combo = 4;
    game.bestCombo = 5;
    game.level = 4;
    game.timeLeft = 24;
    game.rush = true;
    game.orders = [
      ticket('sate-ayam', 30, 32),
      ticket('ayam-geprek', 18, 30),
      ticket('mie-goreng', 9, 34),
      ticket('nasi-goreng', 4, 42),
    ];
    game.board = [
      { id: 1, ingredientId: 'sayur', progress: 1, ready: true },
      { id: 2, ingredientId: 'sambal', progress: 0.8, ready: false },
    ];
    game.plate = ['ayam', 'sambal', 'sayur'];
    game.popup(880, 420, '+160 koin', '#ffd166');
  } else if (name === 'serve') {
    game.score = 860;
    game.coins = 860;
    game.served = 9;
    game.combo = 3;
    game.bestCombo = 3;
    game.level = 3;
    game.timeLeft = 61;
    game.orders = [
      ticket('mie-ayam', 26, 38),
      ticket('nasi-goreng', 31, 42),
    ];
    game.plate = ['mie', 'ayam', 'sayur'];
    game.popup(880, 420, '+240 koin', '#ffd166');
    game.popup(880, 452, 'Kombo x3!', '#ff9f43');
    game.burst(880, 470, '#ffd166', 16);
  }
}

// ---------- input ----------

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (VIEW_W / rect.width),
    y: (event.clientY - rect.top) * (VIEW_H / rect.height),
  };
}

canvas.addEventListener('click', (event) => {
  sound.unlock();
  const { x, y } = canvasPoint(event);
  const geo = layout();
  if (pointIn(geo.mute, x, y)) {
    game.muted = !game.muted;
    sound.setMuted(game.muted);
    return;
  }
  if (pointIn(geo.pause, x, y)) {
    game.togglePause();
    return;
  }
  if (game.phase === 'menu' && pointIn(geo.start, x, y)) {
    game.startShift();
    return;
  }
  if (game.phase === 'over' && pointIn(geo.restart, x, y)) {
    game.startShift();
    return;
  }
  if (game.phase !== 'playing') return;
  for (const bin of geo.bins) {
    if (pointIn(bin, x, y)) { game.sendToBoard(bin.id); return; }
  }
  for (let i = 0; i < geo.boardSlots.length; i++) {
    if (pointIn(geo.boardSlots[i], x, y)) {
      const slot = game.board[i];
      if (slot) game.moveBoardToPlate(slot.id);
      return;
    }
  }
  if (pointIn(geo.serve, x, y)) { game.servePlate(); return; }
  if (pointIn(geo.trash, x, y)) { game.trashPlate(); return; }
});

window.addEventListener('keydown', (event) => {
  sound.unlock();
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === 'm') {
    game.muted = !game.muted;
    sound.setMuted(game.muted);
    return;
  }
  if (key === 'p') { game.togglePause(); return; }
  if (key === 'r' && game.phase === 'over') { game.startShift(); return; }
  if (key === 'enter' && game.phase === 'menu') { game.startShift(); return; }
  if (game.phase !== 'playing') return;
  const ingredient = INGREDIENTS.find((item) => item.key === key);
  if (ingredient) { game.sendToBoard(ingredient.id); return; }
  if (key === ' ') { event.preventDefault(); game.moveFirstReadyToPlate(); }
  if (key === 'enter') game.servePlate();
  if (key === 't') game.trashPlate();
});

// Pause automatically when the tab is hidden, so a shift never drains
// while the player looks away — the timer only runs while you watch.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') game.togglePause();
});

// ---------- the loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(dt);
  renderGame(ctx, game, now / 1000);
  requestAnimationFrame(frame);
}

// A demo scene starts already playing; otherwise the title screen waits.
const demo = new URLSearchParams(window.location.search).get('demo');
if (demo === 'play' || demo === 'rush' || demo === 'serve') {
  loadDemoScene(demo);
  // Freeze the clock for a stable screenshot: the scene is a still.
  game.update = () => {};
} else {
  game.phase = 'menu';
}
requestAnimationFrame(frame);
