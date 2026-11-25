// kitchen.js — the rules and state of Dapur Kilat, no drawing here.
// One clear job: the game model. The renderer reads this state; the input
// layer calls its methods; the sound engine is told what just happened.
//
// The loop: a customer order (a ticket) names a dish. You tap ingredient
// bins to send food to the prep board, it chops/sizzles there, you tap the
// finished item (or press Space) to put it on the plate, and you tap SERVE
// (or press Enter) when the plate holds exactly one ticket's dish. Serve
// right and you earn coins; serve wrong and the plate goes in the bin.
// A shift lasts 150 seconds. Lose all 3 hearts and the shift ends early.

import { INGREDIENTS, RECIPES, ingredientById, plateMatchesRecipe, recipesForLevel } from './recipes.js';

export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const BOARD_SLOTS = 3;
export const RUSH_SECONDS = 30;

export class KitchenGame {
  constructor(sound) {
    this.sound = sound;
    this.phase = 'menu'; // menu | playing | paused | over
    this.score = 0;
    this.coins = 0;
    this.served = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hearts = MAX_HEARTS;
    this.level = 1;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.orders = []; // {id, recipe, patience, maxPatience, born}
    this.board = []; // {id, ingredientId, progress, ready} — prep board slots
    this.plate = []; // ingredient ids, in the order they were plated
    this.popups = []; // {x, y, text, color, life}
    this.particles = []; // {x, y, vx, vy, life, color, size}
    this.shake = 0;
    this.nextOrderId = 1;
    this.nextBoardId = 1;
    this.orderTimer = 0;
    this.orderEvery = 9; // seconds between new tickets (shrinks with level)
    this.rush = false;
    this.reason = ''; // why the shift ended
    this.statServed = 0;
    this.statExpired = 0;
    this.statWrong = 0;
  }

  startShift() {
    this.phase = 'playing';
    this.score = 0;
    this.coins = 0;
    this.served = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hearts = MAX_HEARTS;
    this.level = 1;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.orders = [];
    this.board = [];
    this.plate = [];
    this.popups = [];
    this.particles = [];
    this.shake = 0;
    this.orderTimer = 2.5;
    this.orderEvery = 9;
    this.rush = false;
    this.reason = '';
    this.statServed = 0;
    this.statExpired = 0;
    this.statWrong = 0;
    this.spawnOrder();
    this.spawnOrder();
    this.sound.startMusic(false);
  }

  togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.sound.stopMusic();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.sound.startMusic(this.rush);
    }
  }

  // Pick a dish customers may ask for at this level, weighted to the cheap ones early.
  pickRecipe() {
    const pool = recipesForLevel(this.level);
    const index = Math.floor(Math.pow(Math.random(), 1.4) * pool.length);
    return pool[Math.min(pool.length - 1, index)];
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const recipe = this.pickRecipe();
    const patience = 42 - Math.min(14, (this.level - 1) * 4);
    this.orders.push({
      id: this.nextOrderId++,
      recipe,
      patience,
      maxPatience: patience,
      born: this.elapsed,
    });
  }

  // Tap an ingredient bin: send it to a free prep-board slot.
  sendToBoard(ingredientId) {
    if (this.phase !== 'playing') return false;
    if (this.board.length >= BOARD_SLOTS) return false;
    const ingredient = ingredientById(ingredientId);
    this.board.push({ id: this.nextBoardId++, ingredientId, progress: 0, ready: false });
    this.sound.pickup();
    if (ingredientId === 'ayam') this.sound.sizzle();
    return true;
  }

  // Tap a ready board slot (or press Space): move it onto the plate.
  moveBoardToPlate(slotId) {
    if (this.phase !== 'playing') return false;
    const index = this.board.findIndex((slot) => slot.id === slotId);
    if (index < 0 || !this.board[index].ready) return false;
    const slot = this.board.splice(index, 1)[0];
    this.plate.push(slot.ingredientId);
    this.sound.click();
    this.burst(880, 470, '#ffd166', 6);
    return true;
  }

  // Space moves the first ready item on the board to the plate.
  moveFirstReadyToPlate() {
    const ready = this.board.find((slot) => slot.ready);
    if (ready) return this.moveBoardToPlate(ready.id);
    return false;
  }

  // Empty the plate into the bin.
  trashPlate() {
    if (this.phase !== 'playing' || this.plate.length === 0) return false;
    this.plate = [];
    this.sound.buzz();
    this.popup(880, 560, 'Dibuang!', '#ff6b6b');
    return true;
  }

  // Tap SERVE (or press Enter): pay out the first ticket the plate matches.
  servePlate() {
    if (this.phase !== 'playing' || this.plate.length === 0) return 'empty';
    const matchIndex = this.orders.findIndex((order) =>
      plateMatchesRecipe(this.plate, order.recipe));
    if (matchIndex < 0) {
      this.plate = [];
      this.combo = 0;
      this.statWrong++;
      this.shake = 10;
      this.sound.buzz();
      this.popup(880, 470, 'Salah pesanan!', '#ff6b6b');
      return 'wrong';
    }
    const order = this.orders.splice(matchIndex, 1)[0];
    const patienceBonus = Math.round((order.patience / order.maxPatience) * 30);
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const earned = (order.recipe.price + patienceBonus) * this.combo;
    this.coins += earned;
    this.score += earned;
    this.served += 1;
    this.statServed++;
    this.plate = [];
    this.sound.serve();
    this.sound.coin();
    this.popup(880, 470, `+${earned} koin`, '#ffd166');
    if (this.combo > 1) this.popup(880, 500, `Kombo x${this.combo}!`, '#ff9f43');
    this.burst(880, 470, '#ffd166', 18);
    this.burst(880, 470, '#58b368', 10);
    const newLevel = Math.min(5, Math.floor(this.served / 4) + 1);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.orderEvery = Math.max(5, 9 - (this.level - 1));
      this.sound.levelUp();
      this.popup(640, 300, `LEVEL ${this.level} — makin ramai!`, '#7bd88a');
    }
    return 'served';
  }

  // One tick of the clock (dt in seconds). Drives patience, prep, timer.
  update(dt) {
    if (this.phase !== 'playing') return;
    this.elapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= RUSH_SECONDS && !this.rush) {
      this.rush = true;
      this.sound.setRush(true);
      this.popup(640, 300, 'SERVICE RUSH!', '#ff6b6b');
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endShift('Waktu habis! Shift selesai.');
      return;
    }
    // Prep board: each item cooks toward ready.
    for (const slot of this.board) {
      if (slot.ready) continue;
      const ingredient = ingredientById(slot.ingredientId);
      slot.progress += dt / ingredient.prepSeconds;
      if (slot.progress >= 1) {
        slot.progress = 1;
        slot.ready = true;
        this.sound.ready();
        this.burst(560, 330, '#ffe08a', 5);
      }
    }
    // New tickets arrive on a timer, faster as the level rises.
    this.orderTimer -= dt;
    if (this.orderTimer <= 0) {
      this.spawnOrder();
      this.orderTimer = this.orderEvery * (0.85 + Math.random() * 0.3);
    }
    // Patience drains; an expired ticket costs a heart.
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        this.orders.splice(i, 1);
        this.hearts -= 1;
        this.combo = 0;
        this.statExpired++;
        this.shake = 12;
        this.sound.expired();
        this.popup(640, 200, `Pelanggan pergi — ${order.recipe.name} hangus!`, '#ff6b6b');
        if (this.hearts <= 0) {
          this.hearts = 0;
          this.endShift('Semua pelanggan kabur. Shift berakhir!');
          return;
        }
      }
    }
    // Popups float up and fade; particles drift and fade.
    for (const popup of this.popups) { popup.life -= dt; popup.y -= 28 * dt; }
    this.popups = this.popups.filter((popup) => popup.life > 0);
    for (const part of this.particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vy += 60 * dt;
    }
    this.particles = this.particles.filter((part) => part.life > 0);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  }

  endShift(reason) {
    this.phase = 'over';
    this.reason = reason;
    this.sound.stopMusic();
    this.sound.gameOver();
  }

  popup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 1.6 });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.5 + Math.random() * 0.5,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  // How many of the plate's ingredients does a ticket still need? Used to
  // highlight the ticket the player is closest to finishing.
  plateProgressFor(order) {
    const plate = [...this.plate];
    let matched = 0;
    for (const need of order.recipe.needs) {
      const at = plate.indexOf(need);
      if (at >= 0) { matched++; plate.splice(at, 1); }
    }
    return matched / order.recipe.needs.length;
  }

  // The ticket the plate is closest to completing (for the hint arrow).
  closestOrder() {
    let best = null;
    let bestScore = 0;
    for (const order of this.orders) {
      const progress = this.plateProgressFor(order);
      if (progress > bestScore) { bestScore = progress; best = order; }
    }
    return bestScore > 0 ? best : null;
  }
}
