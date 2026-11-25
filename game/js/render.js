// render.js — every pixel of Dapur Kilat, drawn on one canvas.
// One clear job: drawing only. It reads the KitchenGame state and paints
// the kitchen, the order board, the counters, the plate and the overlays.
// No game rules live here; no sound; no input. All art is original vector
// work drawn with canvas paths — no images, no fonts from the network.

import { INGREDIENTS, ingredientById } from './recipes.js';
import { BOARD_SLOTS, RUSH_SECONDS } from './kitchen.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Geometry of every clickable zone, shared with the input layer in main.js.
export function layout() {
  const bins = INGREDIENTS.map((ingredient, i) => ({
    id: ingredient.id,
    x: 48 + (i % 2) * 158,
    y: 218 + Math.floor(i / 2) * 128,
    w: 146,
    h: 116,
  }));
  const boardSlots = [0, 1, 2].map((i) => ({
    x: 392 + i * 132,
    y: 240,
    w: 120,
    h: 120,
  }));
  return {
    bins,
    boardSlots,
    serve: { x: 812, y: 548, w: 200, h: 64 },
    trash: { x: 1024, y: 548, w: 120, h: 64 },
    start: { x: 490, y: 470, w: 300, h: 72 },
    restart: { x: 490, y: 520, w: 300, h: 64 },
    pause: { x: 1150, y: 12, w: 56, h: 40 },
    mute: { x: 1086, y: 12, w: 56, h: 40 },
    plate: { x: 812, y: 216, w: 332, h: 300 },
    tickets: [0, 1, 2, 3].map((i) => ({ x: 48 + i * 308, y: 84, w: 292, h: 92 })),
  };
}

const L = layout();

// ---------- tiny drawing helpers ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(0,0,0,0.25)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ---------- ingredient icons (original vector food) ----------

export function drawIngredientIcon(ctx, id, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, r * 0.08);
  if (id === 'nasi') {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.85, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    for (const [dx, dy] of [[-0.4, -0.1], [0, -0.35], [0.4, -0.05], [-0.15, 0.1], [0.25, 0.15]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'mie') {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      const y = (i - 1.5) * r * 0.32;
      ctx.moveTo(-r * 0.85, y);
      ctx.bezierCurveTo(-r * 0.4, y - r * 0.3, -r * 0.1, y + r * 0.3, r * 0.3, y);
      ctx.bezierCurveTo(r * 0.6, y - r * 0.25, r * 0.75, y + r * 0.15, r * 0.85, y);
      ctx.stroke();
    }
  } else if (id === 'ayam') {
    ctx.fillStyle = '#b06a2e';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, r * 0.1, r * 0.72, r * 0.55, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99a55';
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, -r * 0.05, r * 0.4, r * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5efe0';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.35);
    ctx.lineTo(r * 0.85, -r * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#f5efe0';
    ctx.beginPath();
    ctx.arc(r * 0.9, -r * 0.8, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'telur') {
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6c945';
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.05, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a91c';
    ctx.beginPath();
    ctx.arc(r * 0.22, -r * 0.15, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'sayur') {
    ctx.fillStyle = '#3f9e4d';
    for (const [dx, dy, rot] of [[-0.35, 0.1, -0.7], [0.05, -0.35, 0.3], [0.4, 0.15, 0.9]]) {
      ctx.save();
      ctx.translate(dx * r, dy * r);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#2c7a38';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.5);
    ctx.lineTo(r * 0.7, -r * 0.2);
    ctx.stroke();
  } else if (id === 'sambal') {
    ctx.strokeStyle = '#d64541';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.2, r * 0.1, r * 0.15, r * 0.75);
    ctx.stroke();
    ctx.strokeStyle = '#e8706a';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.1, r * 0.05, r * 0.1, r * 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#58b368';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.75, -r * 0.85, -r * 0.45, -r * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- the kitchen ----------

function drawWallAndFloor(ctx, time) {
  ctx.fillStyle = '#f3e2c7';
  ctx.fillRect(0, 0, VIEW_W, 190);
  ctx.fillStyle = '#e8d3ae';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 16; col++) {
      if ((row + col) % 2 === 0) continue;
      ctx.fillRect(col * 80 + (row % 2) * 40, 8 + row * 56, 76, 52);
    }
  }
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, 178, VIEW_W, 14);
  ctx.fillStyle = '#c98f5f';
  ctx.fillRect(0, 192, VIEW_W, VIEW_H - 192);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 8; i++) ctx.fillRect(0, 240 + i * 62, VIEW_W, 4);
  // A window with a lazy sun and drifting clouds, for warmth.
  ctx.fillStyle = '#bfe3f2';
  roundRect(ctx, 1060, 18, 180, 120, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(1115, 62, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const cloudX = 1150 + Math.sin(time * 0.3) * 14;
  ctx.beginPath();
  ctx.ellipse(cloudX, 105, 34, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(cloudX + 24, 100, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTopBar(ctx, game) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = '#ff9f43';
  roundRect(ctx, 16, 12, 44, 40, 10);
  ctx.fill();
  drawIngredientIcon(ctx, 'ayam', 38, 32, 15);
  text(ctx, 'DAPUR KILAT', 70, 33, 26, '#fff3e0', '800');
  text(ctx, 'Skor  ' + game.score, 300, 33, 20, '#ffd166', '800');
  text(ctx, 'Koin  ' + game.coins, 460, 33, 20, '#ffd166', '800');
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < game.hearts ? '#ff5b5b' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    const hx = 620 + i * 30;
    ctx.arc(hx, 30, 9, 0, Math.PI * 2);
    ctx.arc(hx + 12, 30, 9, 0, Math.PI * 2);
    ctx.moveTo(hx - 3, 38);
    ctx.lineTo(hx + 21, 38);
    ctx.lineTo(hx + 9, 50);
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, 'Lv ' + game.level, 730, 33, 20, '#7bd88a', '800');
  const mm = String(Math.floor(game.timeLeft / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.timeLeft % 60)).padStart(2, '0');
  const low = game.timeLeft <= RUSH_SECONDS && game.phase === 'playing';
  const pulse = low ? 0.75 + Math.sin(performance.now() / 120) * 0.25 : 1;
  ctx.globalAlpha = pulse;
  text(ctx, `⏱ ${mm}:${ss}`, 800, 33, 26, low ? '#ff6b6b' : '#ffffff', '800');
  ctx.globalAlpha = 1;
  if (game.rush && game.phase === 'playing') text(ctx, 'RUSH!', 960, 33, 20, '#ff6b6b', '800');
  for (const [rect, label] of [[L.mute, game.muted ? '🔇' : '🔊'], [L.pause, game.phase === 'paused' ? '▶' : '⏸']]) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 18, '#fff', '700', 'center');
  }
}

function drawTicket(ctx, order, rect, game) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = frac < 0.35;
  const closest = game.closestOrder() === order && game.plate.length > 0;
  ctx.fillStyle = urgent ? '#ffe3e3' : '#fffdf5';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.strokeStyle = closest ? '#ffb703' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = closest ? 4 : 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.stroke();
  ctx.fillStyle = '#7a5230';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(rect.x + 14 + i * 8, rect.y + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, order.recipe.name, rect.x + 14, rect.y + 26, 17, '#2b2118', '800');
  text(ctx, `${order.recipe.price} koin`, rect.x + rect.w - 14, rect.y + 26, 14, '#b07a1e', '800', 'right');
  order.recipe.needs.forEach((need, i) => {
    const ingredient = ingredientById(need);
    const onPlate = game.plate.includes(need);
    ctx.fillStyle = onPlate ? '#d8f3dc' : '#f1e6d0';
    ctx.beginPath();
    ctx.arc(rect.x + 30 + i * 46, rect.y + 56, 17, 0, Math.PI * 2);
    ctx.fill();
    drawIngredientIcon(ctx, need, rect.x + 30 + i * 46, rect.y + 56, 13);
    if (onPlate) {
      ctx.strokeStyle = '#2f9e44';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rect.x + 22 + i * 46, rect.y + 56);
      ctx.lineTo(rect.x + 28 + i * 46, rect.y + 62);
      ctx.lineTo(rect.x + 40 + i * 46, rect.y + 48);
      ctx.stroke();
    }
    text(ctx, ingredient.name, rect.x + 30 + i * 46, rect.y + 78, 11, '#6b543a', '700', 'center');
  });
  bar(ctx, rect.x + 14, rect.y + rect.h - 7, rect.w - 28, 5, frac, urgent ? '#ff5b5b' : '#58b368');
}

function drawBins(ctx, game) {
  text(ctx, 'BAHAN — klik atau tekan 1-6', 48, 200, 15, '#5b4128', '800');
  for (const bin of L.bins) {
    const ingredient = ingredientById(bin.id);
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 12);
    ctx.fill();
    ctx.fillStyle = '#a9743f';
    roundRect(ctx, bin.x + 6, bin.y + 6, bin.w - 12, bin.h - 12, 9);
    ctx.fill();
    drawIngredientIcon(ctx, bin.id, bin.x + bin.w / 2, bin.y + 46, 30);
    text(ctx, ingredient.name, bin.x + bin.w / 2, bin.y + 90, 16, '#fff3e0', '800', 'center');
    text(ctx, `[${ingredient.key}]`, bin.x + bin.w / 2, bin.y + 108, 11, '#ffd9a0', '700', 'center');
  }
}

function drawBoard(ctx, game, time) {
  text(ctx, 'PAPAN MASAK — Spasi = ke piring', 372, 200, 15, '#5b4128', '800');
  ctx.fillStyle = '#6b4226';
  roundRect(ctx, 372, 214, 396, 172, 14);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  roundRect(ctx, 380, 222, 380, 156, 10);
  ctx.fill();
  for (let i = 0; i < BOARD_SLOTS; i++) {
    const slot = L.boardSlots[i];
    const item = game.board[i];
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 12);
    ctx.fill();
    if (!item) {
      text(ctx, '—', slot.x + slot.w / 2, slot.y + slot.h / 2, 28, 'rgba(255,255,255,0.35)', '700', 'center');
      continue;
    }
    const ingredient = ingredientById(item.ingredientId);
    if (!item.ready) {
      // Sizzling: steam wisps + a progress ring.
      drawIngredientIcon(ctx, item.ingredientId, slot.x + slot.w / 2, slot.y + slot.h / 2, 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(slot.x + slot.w / 2, slot.y + slot.h / 2, 44, -Math.PI / 2, -Math.PI / 2 + item.progress * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let s = 0; s < 3; s++) {
        const wobble = Math.sin(time * 3 + s * 2 + item.id) * 6;
        ctx.beginPath();
        ctx.ellipse(slot.x + slot.w / 2 + wobble, slot.y + 18 - s * 8, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, slot.x + slot.w / 2 - 34, slot.y + slot.h - 24, 68, 18, 9);
      ctx.fill();
      text(ctx, ingredient.name, slot.x + slot.w / 2, slot.y + slot.h - 14, 12, '#ffe9c4', '700', 'center');
    } else {
      ctx.fillStyle = '#d8f3dc';
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 12);
      ctx.fill();
      drawIngredientIcon(ctx, item.ingredientId, slot.x + slot.w / 2, slot.y + slot.h / 2 - 6, 32);
      text(ctx, 'SIAP! klik', slot.x + slot.w / 2, slot.y + slot.h - 12, 12, '#2f9e44', '800', 'center');
    }
  }
  // The stove under the board, flame flickering.
  ctx.fillStyle = '#3a3a3a';
  roundRect(ctx, 420, 402, 300, 96, 12);
  ctx.fill();
  for (let b = 0; b < 2; b++) {
    const bx = 480 + b * 160;
    const flame = 14 + Math.sin(time * 9 + b * 3) * 5;
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.ellipse(bx, 470, 26, flame + 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(bx, 472, 14, flame * 0.6 + 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, 452, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  text(ctx, 'KOMPOR', 570, 516, 14, '#fff3e0', '800', 'center');
}

function drawPlateArea(ctx, game) {
  const rect = L.plate;
  text(ctx, 'PIRING SAJI', rect.x, 200, 15, '#5b4128', '800');
  ctx.fillStyle = '#f7ead2';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + 150;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 130, 84, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c9a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 130, 84, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f3e7cf';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 96, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (game.plate.length === 0) {
    text(ctx, 'Piring kosong —', cx, cy - 8, 16, '#a08a68', '700', 'center');
    text(ctx, 'masak bahan dulu!', cx, cy + 16, 16, '#a08a68', '700', 'center');
  } else {
    game.plate.forEach((id, i) => {
      const angle = (i / Math.max(1, game.plate.length)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * 52;
      const py = cy + Math.sin(angle) * 30;
      drawIngredientIcon(ctx, id, px, py, 26);
    });
  }
  const closest = game.closestOrder();
  if (closest && game.plate.length > 0) {
    const done = game.plate.length === closest.recipe.needs.length;
    text(ctx, done ? `Siap disajikan: ${closest.recipe.name}!` : `Menuju: ${closest.recipe.name}`, cx, rect.y + rect.h - 16, 15, done ? '#2f9e44' : '#6b543a', '800', 'center');
  }
  // SERVE and TRASH buttons.
  const serve = L.serve;
  const canServe = game.plate.length > 0;
  ctx.fillStyle = canServe ? '#2f9e44' : '#9aa5a0';
  roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 12);
  ctx.fill();
  text(ctx, 'SAJIKAN ✓', serve.x + serve.w / 2, serve.y + serve.h / 2, 24, '#ffffff', '800', 'center');
  text(ctx, '[Enter]', serve.x + serve.w / 2, serve.y + serve.h - 14, 11, 'rgba(255,255,255,0.8)', '700', 'center');
  const trash = L.trash;
  ctx.fillStyle = game.plate.length > 0 ? '#d64541' : '#9aa5a0';
  roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 12);
  ctx.fill();
  text(ctx, 'BUANG', trash.x + trash.w / 2, trash.y + trash.h / 2, 18, '#ffffff', '800', 'center');
}

function drawHintBar(ctx, game) {
  ctx.fillStyle = 'rgba(43,33,24,0.85)';
  roundRect(ctx, 40, 668, 1200, 36, 10);
  ctx.fill();
  text(ctx, '1-6 bahan  •  Spasi: ke piring  •  Enter: sajikan  •  T: buang  •  P: jeda  •  M: suara', 640, 686, 15, '#ffe9c4', '700', 'center');
}

function drawParticles(ctx, game) {
  for (const part of game.particles) {
    ctx.globalAlpha = Math.max(0, part.life);
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const popup of game.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, popup.life));
    text(ctx, popup.text, popup.x, popup.y, 26, popup.color, '800', 'center');
  }
  ctx.globalAlpha = 1;
}

function overlay(ctx, title, lines, buttonLabel, buttonRect, accent) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff8ea';
  roundRect(ctx, 340, 110, 600, 470, 18);
  ctx.fill();
  ctx.fillStyle = accent;
  roundRect(ctx, 340, 110, 600, 10, 5);
  ctx.fill();
  text(ctx, title, 640, 170, 40, '#2b2118', '800', 'center');
  lines.forEach((line, i) => text(ctx, line.text, 640, 230 + i * 34, line.size ?? 18, line.color ?? '#4a3626', '700', 'center'));
  if (buttonLabel && buttonRect) {
    ctx.fillStyle = '#2f9e44';
    roundRect(ctx, buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 12);
    ctx.fill();
    text(ctx, buttonLabel, buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2, 24, '#fff', '800', 'center');
  }
}

// ---------- the one public entry point ----------

export function renderGame(ctx, game, time) {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawWallAndFloor(ctx, time);
  drawTopBar(ctx, game);
  if (game.phase === 'menu') {
    drawBins(ctx, game);
    drawBoard(ctx, game, time);
    drawPlateArea(ctx, game);
    overlay(ctx, 'DAPUR KILAT', [
      { text: 'Dapur paling sibuk di kota buka!', size: 20 },
      { text: 'Pesanan datang terus — masak, rakit, sajikan cepat.', size: 17 },
      { text: 'Klik bahan (1-6) → tunggu matang → Spasi ke piring → Enter sajikan.', size: 17 },
      { text: 'Sajikan cepat = bonus koin. Kombo beruntun = koin berlipat.', size: 17 },
      { text: 'Shift 150 detik • 3 hati • makin tinggi level, makin ramai.', size: 17 },
    ], '▶  MULAI SHIFT', L.start, '#ff9f43');
    ctx.restore();
    return;
  }
  game.orders.forEach((order, i) => drawTicket(ctx, order, L.tickets[i], game));
  if (game.orders.length === 0) {
    text(ctx, 'Belum ada pesanan… sebentar lagi datang!', 640, 130, 18, '#6b543a', '700', 'center');
  }
  drawBins(ctx, game);
  drawBoard(ctx, game, time);
  drawPlateArea(ctx, game);
  drawParticles(ctx, game);
  drawHintBar(ctx, game);
  if (game.phase === 'paused') {
    overlay(ctx, 'JEDA', [
      { text: 'Istirahat sebentar, kompor tetap panas.', size: 18 },
      { text: 'Tekan P atau klik tombol ▶ untuk lanjut.', size: 18 },
    ], null, null, '#7bd88a');
  } else if (game.phase === 'over') {
    overlay(ctx, 'SHIFT SELESAI!', [
      { text: game.reason, size: 19, color: '#2b2118' },
      { text: `Skor akhir: ${game.score}  •  Koin: ${game.coins}`, size: 20 },
      { text: `Disajikan: ${game.statServed}  •  Hangus: ${game.statExpired}  •  Salah: ${game.statWrong}`, size: 17 },
      { text: `Kombo terbaik: x${game.bestCombo}  •  Level: ${game.level}`, size: 17 },
      { text: 'Tekan R atau klik tombol untuk shift berikutnya.', size: 17 },
    ], '↻  MAIN LAGI', L.restart, '#2f9e44');
  }
  ctx.restore();
}
