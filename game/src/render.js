// Copper Pot Kitchen — rendering. Every pixel is drawn with the canvas 2D
// API: the kitchen, the order board, the food, the chef and the screens.
// No images, no fonts from the network; the only typeface is the system
// sans-serif stack.
import {
  BURN_SECONDS,
  COOK_SECONDS,
  FLOOR,
  INGREDIENTS,
  RECIPES,
  SOUP_COOK_SECONDS,
  STATIONS,
  BURNERS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const TILE = 46;

// --- Small drawing helpers -------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

// --- Food icons ------------------------------------------------------------
// One icon per ingredient, drawn from shapes so the dish reads at a glance.
// `prep` changes the drawing: chopped food is cut into pieces, cooked food
// is browned, burnt food is charcoal.
export function drawIngredientIcon(ctx, id, prep, x, y, size) {
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (prep === 'chopped') {
    const color = INGREDIENTS[id] ? INGREDIENTS[id].color : '#888';
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * half * 0.45, Math.sin(angle) * half * 0.45, half * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (prep === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half * 0.4, -half * 0.2);
    ctx.lineTo(half * 0.4, half * 0.2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (id === 'soup') {
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(0, half * 0.1, half * 0.95, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#e8590c';
    ctx.beginPath();
    ctx.arc(0, half * 0.05, half * 0.72, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(half * 0.5, -half * 0.5);
    ctx.quadraticCurveTo(half * 0.7, -half * 0.9, half * 0.4, -half * 0.95);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (id === 'tomato') {
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(0, half * 0.08, half * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#46a758';
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.75);
    ctx.lineTo(-half * 0.42, -half * 0.25);
    ctx.lineTo(half * 0.42, -half * 0.25);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#46a758';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.55);
    ctx.lineTo(0, half * 0.55);
    ctx.stroke();
  } else if (id === 'onion') {
    ctx.fillStyle = '#b07fd4';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f3f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.25, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f5b83d';
    ctx.beginPath();
    ctx.moveTo(-half * 0.9, half * 0.6);
    ctx.lineTo(half * 0.9, half * 0.6);
    ctx.lineTo(0, -half * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9930d';
    ctx.beginPath();
    ctx.arc(-half * 0.25, half * 0.2, half * 0.14, 0, Math.PI * 2);
    ctx.arc(half * 0.3, half * 0.3, half * 0.11, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bun') {
    ctx.fillStyle = '#d9a05b';
    ctx.beginPath();
    ctx.arc(0, half * 0.15, half * 0.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-half * 0.9, half * 0.15, half * 1.8, half * 0.35);
    ctx.fillStyle = '#fff3bf';
    ctx.beginPath();
    ctx.arc(-half * 0.3, -half * 0.25, 2, 0, Math.PI * 2);
    ctx.arc(half * 0.25, -half * 0.35, 2, 0, Math.PI * 2);
    ctx.arc(half * 0.05, -half * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'patty') {
    ctx.fillStyle = prep === 'cooked' ? '#6b4423' : '#8a5a3b';
    roundRect(ctx, -half * 0.95, -half * 0.45, half * 1.9, half * 0.9, half * 0.4);
    ctx.fill();
    if (prep === 'cooked') {
      ctx.strokeStyle = '#4a2c14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half * 0.5, -half * 0.45);
      ctx.lineTo(-half * 0.5, half * 0.45);
      ctx.moveTo(half * 0.1, -half * 0.45);
      ctx.lineTo(half * 0.1, half * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- Kitchen ----------------------------------------------------------------

function drawFloor(ctx) {
  ctx.fillStyle = '#7a5c3e';
  ctx.fillRect(0, FLOOR.y, VIEW_WIDTH, FLOOR.height + 12);
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.height; y += TILE) {
    for (let x = 0; x < VIEW_WIDTH; x += TILE) {
      const odd = ((x / TILE) | 0) + ((y / TILE) | 0);
      ctx.fillStyle = odd % 2 === 0 ? '#8a6a48' : '#82643f';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, FLOOR.y + 1.5, VIEW_WIDTH - 3, FLOOR.height + 9);
}

function drawCrate(ctx, station) {
  ctx.fillStyle = '#5c3d24';
  roundRect(ctx, station.x, station.y, station.w, station.h, 8);
  ctx.fill();
  ctx.fillStyle = '#6d4a2f';
  ctx.fillRect(station.x + 6, station.y + 6, station.w - 12, station.h - 12);
  drawIngredientIcon(ctx, station.ingredient, 'raw', station.x + station.w / 2, station.y + 22, 26);
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 9, 11, '#ffe8cc', 'center');
}

function drawBoard(ctx, station, world) {
  ctx.fillStyle = '#3d2b1f';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.fillStyle = '#c9a06a';
  roundRect(ctx, station.x + 10, station.y + 10, station.w - 20, station.h - 26, 6);
  ctx.fill();
  const chopping = world.chef.chopping;
  if (chopping) {
    const item = world.chef.carry[chopping.itemIndex];
    if (item) drawIngredientIcon(ctx, item.id, 'chopped', station.x + station.w / 2, station.y + 34, 26);
    const ratio = chopping.progress / chopping.total;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(station.x + 16, station.y + station.h - 22, station.w - 32, 10);
    ctx.fillStyle = ratio > 0.66 ? '#69db7c' : '#ffd43b';
    ctx.fillRect(station.x + 16, station.y + station.h - 22, (station.w - 32) * ratio, 10);
    // The knife, mid-chop.
    const lift = Math.sin(chopping.progress * 14) * 8;
    ctx.save();
    ctx.translate(station.x + station.w - 34, station.y + 22 + lift);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(0, 0, 26, 5);
    ctx.fillStyle = '#343a40';
    ctx.fillRect(26, 0, 12, 5);
    ctx.restore();
  } else {
    ctx.fillStyle = '#8d6b45';
    text(ctx, 'CHOP', station.x + station.w / 2, station.y + 30, 13, '#5c3d24', 'center');
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(station.x + station.w - 44, station.y + 16, 26, 5);
    ctx.fillStyle = '#343a40';
    ctx.fillRect(station.x + station.w - 18, station.y + 16, 12, 5);
  }
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 8, 11, '#ffe8cc', 'center');
}

function drawStove(ctx, station, world) {
  ctx.fillStyle = '#343a40';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.fillStyle = '#212529';
  roundRect(ctx, station.x + 8, station.y + 8, station.w - 16, station.h - 26, 6);
  ctx.fill();
  for (let i = 0; i < BURNERS.length; i += 1) {
    const burner = world.burners[i];
    const bx = station.x + BURNERS[i].dx;
    const by = station.y + BURNERS[i].dy;
    const r = BURNERS[i].r;
    ctx.fillStyle = burner.state === 'cooking' ? '#e8590c' : '#495057';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#868e96';
    ctx.beginPath();
    ctx.arc(bx, by, r - 6, 0, Math.PI * 2);
    ctx.fill();
    if (burner.item) {
      drawIngredientIcon(ctx, burner.item.id, burner.item.prep, bx, by, 30);
    }
    if (burner.state === 'cooking' || burner.state === 'done' || burner.state === 'burnt') {
      const doneAt = burner.item && burner.item.id === 'soup' ? SOUP_COOK_SECONDS : COOK_SECONDS;
      const ratio = Math.min(1, burner.progress / doneAt);
      const burnRatio = Math.min(1, burner.progress / BURN_SECONDS);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx - r, by + r + 4, r * 2, 6);
      ctx.fillStyle = burner.state === 'burnt' ? '#ff6b6b' : burner.state === 'done' ? '#69db7c' : '#ffd43b';
      ctx.fillRect(bx - r, by + r + 4, r * 2 * (burner.state === 'burnt' ? burnRatio : ratio), 6);
      if (burner.state === 'done') {
        text(ctx, 'READY!', bx, by - r - 8, 11, '#69db7c', 'center');
      }
    }
  }
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 8, 11, '#ffe8cc', 'center');
}

function drawAssembly(ctx, station, world) {
  ctx.fillStyle = '#495057';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.fillStyle = '#868e96';
  roundRect(ctx, station.x + 10, station.y + 10, station.w - 20, station.h - 34, 8);
  ctx.fill();
  // The plate and everything stacked on it.
  const plateX = station.x + 90;
  const plateY = station.y + 40;
  ctx.fillStyle = '#f8f9fa';
  ctx.beginPath();
  ctx.ellipse(plateX, plateY, 52, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#adb5bd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(plateX, plateY, 52, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  world.plate.forEach((item, index) => {
    drawIngredientIcon(ctx, item.id, item.prep, plateX - 26 + index * 26, plateY - 14 - index * 4, 26);
  });
  const match = world.orders.find(
    (o) => o.state === 'active' && world.plate.length > 0 && plateMatches(world.plate, o.recipeId),
  );
  if (match) {
    const pulse = 0.7 + Math.sin(world.time * 6) * 0.3;
    ctx.fillStyle = `rgba(105, 219, 124, ${pulse})`;
    roundRect(ctx, station.x + 170, station.y + 18, 150, 44, 8);
    ctx.fill();
    text(ctx, `SERVE ${match.short}!`, station.x + 245, station.y + 40, 17, '#1b4332', 'center');
    text(ctx, 'press E', station.x + 245, station.y + 58, 11, '#1b4332', 'center');
  } else if (world.plate.length > 0) {
    text(ctx, 'building…', station.x + 245, station.y + 40, 14, '#343a40', 'center');
  } else {
    text(ctx, 'Plate here', station.x + 245, station.y + 40, 14, '#495057', 'center');
  }
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 8, 11, '#ffe8cc', 'center');
}

function plateMatches(plate, recipeId) {
  const needs = RECIPES[recipeId].needs;
  if (plate.length !== needs.length) return false;
  const remaining = needs.map((n) => `${n.id}:${n.prep}`);
  for (const item of plate) {
    const index = remaining.indexOf(`${item.id}:${item.prep}`);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

function drawWindow(ctx, station, world) {
  ctx.fillStyle = '#7048e8';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.fillStyle = '#9775fa';
  roundRect(ctx, station.x + 10, station.y + 10, station.w - 20, station.h - 34, 8);
  ctx.fill();
  if (world.servedDish && world.servedDishTtl > 0) {
    const recipe = RECIPES[world.servedDish.recipeId];
    const needs = recipe ? recipe.needs : [];
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.ellipse(station.x + 52, station.y + 46, 34, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    needs.forEach((need, index) => {
      drawIngredientIcon(ctx, need.id, need.prep, station.x + 32 + index * 20, station.y + 34, 20);
    });
    text(ctx, world.servedDish.name, station.x + 118, station.y + 30, 14, '#ffffff', 'center');
    text(ctx, 'served!', station.x + 118, station.y + 50, 12, '#e5dbff', 'center');
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    text(ctx, '— serve here —', station.x + station.w / 2, station.y + 40, 13, '#e5dbff', 'center');
  }
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 8, 11, '#ffe8cc', 'center');
}

function drawBin(ctx, station) {
  ctx.fillStyle = '#343a40';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.fillStyle = '#868e96';
  roundRect(ctx, station.x + 14, station.y + 14, station.w - 28, station.h - 36, 6);
  ctx.fill();
  // A little trash can, drawn from shapes.
  const cx = station.x + station.w / 2;
  const cy = station.y + 36;
  ctx.fillStyle = '#dee2e6';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 10);
  ctx.lineTo(cx + 14, cy - 10);
  ctx.lineTo(cx + 11, cy + 12);
  ctx.lineTo(cx - 11, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - 17, cy - 13, 34, 4);
  ctx.strokeStyle = '#868e96';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 6);
  ctx.lineTo(cx - 5, cy + 8);
  ctx.moveTo(cx + 5, cy - 6);
  ctx.lineTo(cx + 5, cy + 8);
  ctx.stroke();
  text(ctx, station.label, station.x + station.w / 2, station.y + station.h - 8, 11, '#ffe8cc', 'center');
}

function drawStations(ctx, world) {
  for (const [id, station] of Object.entries(STATIONS)) {
    if (station.kind === 'crate') drawCrate(ctx, station);
    else if (station.kind === 'board') drawBoard(ctx, station, world);
    else if (station.kind === 'stove') drawStove(ctx, station, world);
    else if (station.kind === 'assembly') drawAssembly(ctx, station, world);
    else if (station.kind === 'window') drawWindow(ctx, station, world);
    else if (station.kind === 'bin') drawBin(ctx, station);
  }
}

// --- The chef -----------------------------------------------------------------

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.walking ? Math.sin(world.time * 14) * 2 : Math.sin(world.time * 2) * 1;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#f8f9fa';
  ctx.beginPath();
  ctx.arc(0, 4, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8590c';
  ctx.fillRect(-9, 2, 18, 16);
  // Head.
  ctx.fillStyle = '#ffd6a5';
  ctx.beginPath();
  ctx.arc(0, -14, 12, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -24, 7, 0, Math.PI * 2);
  ctx.arc(0, -27, 8, 0, Math.PI * 2);
  ctx.arc(7, -24, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -24, 22, 5);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#212529';
  ctx.beginPath();
  ctx.arc(chef.facing * 4 - 4, -15, 1.8, 0, Math.PI * 2);
  ctx.arc(chef.facing * 4 + 4, -15, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Carried ingredients, stacked above the hat.
  chef.carry.forEach((item, index) => {
    drawIngredientIcon(ctx, item.id, item.prep, 0, -44 - index * 20, 22);
  });
  if (chef.chopping) {
    text(ctx, 'chopping…', 0, -66 - chef.carry.length * 20, 11, '#ffffff', 'center');
  }
  ctx.restore();
}

// --- Order board and HUD ------------------------------------------------------

function drawOrderBoard(ctx, world) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, VIEW_WIDTH, 88);
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, 84, VIEW_WIDTH, 4);
  text(ctx, 'ORDERS', 18, 16, 13, '#ffd166');
  let x = 18;
  for (const order of world.orders) {
    if (order.state !== 'active') continue;
    const ratio = Math.max(0, order.patience / order.maxPatience);
    const urgent = ratio < 0.3;
    ctx.fillStyle = urgent && Math.sin(world.time * 8) > 0 ? '#5c1a1a' : '#f8f9fa';
    roundRect(ctx, x, 26, 208, 54, 8);
    ctx.fill();
    text(ctx, order.short, x + 10, 40, 15, '#212529');
    text(ctx, `${Math.ceil(order.patience)}s`, x + 198, 40, 13, urgent ? '#e03131' : '#495057', 'right');
    const recipe = RECIPES[order.recipeId];
    recipe.needs.forEach((need, index) => {
      drawIngredientIcon(ctx, need.id, need.prep, x + 22 + index * 30, 62, 22);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 10, 74, 188, 4);
    ctx.fillStyle = urgent ? '#e03131' : ratio < 0.6 ? '#f59f00' : '#69db7c';
    ctx.fillRect(x + 10, 74, 188 * ratio, 4);
    x += 218;
  }
  if (world.orders.filter((o) => o.state === 'active').length === 0) {
    text(ctx, 'No orders — breathe!', 140, 54, 14, '#adb5bd');
  }
  // Score, timer, hearts and combo on the right.
  const right = VIEW_WIDTH - 18;
  const seconds = Math.max(0, Math.ceil(world.timeLeft));
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  const lowTime = world.timeLeft <= 30 && world.screen === 'play';
  text(ctx, `${minutes}:${secs}`, right, 30, 30, lowTime ? '#ff6b6b' : '#ffffff', 'right');
  text(ctx, `SCORE ${world.score}`, right, 58, 16, '#ffd166', 'right');
  let heartX = right - 150;
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.hearts ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(heartX, 58, 7, 0, Math.PI * 2);
    ctx.fill();
    heartX += 18;
  }
  if (world.combo >= 2) {
    text(ctx, `COMBO x${world.combo}`, right - 190, 30, 15, '#ff8fa3', 'right');
  }
  text(ctx, 'Copper Pot Kitchen', right, 78, 11, '#868e96', 'right');
}

function drawPopups(ctx, world) {
  for (const popup of world.popups) {
    const alpha = Math.min(1, popup.ttl);
    ctx.globalAlpha = alpha;
    text(ctx, popup.text, popup.x, popup.y - (1.4 - popup.ttl) * 24, 16, popup.color, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawHintBar(ctx, world) {
  const station = world.chef.chopping ? 'board' : null;
  let hint = 'WASD / arrows to walk · E to use a station · click a station to walk to it · M mute';
  if (station) hint = 'Chopping… hold still!';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 300, VIEW_HEIGHT - 24, 680, 20, 10);
  ctx.fill();
  text(ctx, hint, 640, VIEW_HEIGHT - 14, 12, '#f1f3f5', 'center', false);
}

// --- Screens ------------------------------------------------------------------

function drawTitleScreen(ctx, world) {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  text(ctx, 'COPPER POT KITCHEN', 640, 120, 54, '#ffd166', 'center');
  text(ctx, 'a tiny restaurant, a very busy shift', 640, 164, 18, '#ffe8cc', 'center', false);
  // A sample plate of the food, drawn big so the title frame shows the game.
  drawIngredientIcon(ctx, 'bun', 'raw', 520, 230, 64);
  drawIngredientIcon(ctx, 'patty', 'cooked', 580, 230, 64);
  drawIngredientIcon(ctx, 'tomato', 'chopped', 640, 230, 64);
  drawIngredientIcon(ctx, 'lettuce', 'chopped', 700, 230, 64);
  drawIngredientIcon(ctx, 'cheese', 'raw', 760, 230, 64);
  text(ctx, 'Take orders · chop · cook · plate · serve before the timer runs out', 640, 300, 16, '#ffffff', 'center', false);
  text(ctx, 'WASD / arrows walk · E use station · mouse click walks & uses · M mute', 640, 328, 14, '#adb5bd', 'center', false);
  const pulse = 0.65 + Math.sin(world.time * 4) * 0.35;
  ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
  roundRect(ctx, 490, 360, 300, 46, 10);
  ctx.fill();
  text(ctx, 'PRESS ENTER TO COOK', 640, 383, 18, '#3d2b1f', 'center');
  if (world.best > 0) text(ctx, `Best score: ${world.best}`, 640, 430, 14, '#ffd166', 'center');
}

function drawGameOverScreen(ctx, world) {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  text(ctx, 'SHIFT OVER', 640, 110, 48, '#ffd166', 'center');
  text(ctx, world.overReason, 640, 156, 17, '#ffe8cc', 'center', false);
  text(ctx, `SCORE  ${world.score}`, 640, 216, 34, '#ffffff', 'center');
  text(ctx, `Dishes served: ${world.served}    Best combo: x${world.bestCombo}    Tips earned: $${world.earned}`, 640, 262, 16, '#adb5bd', 'center', false);
  if (world.best > 0) text(ctx, `Best score: ${world.best}`, 640, 296, 14, '#ffd166', 'center');
  const pulse = 0.65 + Math.sin(world.time * 4) * 0.35;
  ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
  roundRect(ctx, 490, 330, 300, 46, 10);
  ctx.fill();
  text(ctx, 'PRESS R TO COOK AGAIN', 640, 353, 18, '#3d2b1f', 'center');
}

// --- Frame --------------------------------------------------------------------

// Draw one frame of the game for the given world and screen.
export function drawFrame(ctx, world) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawFloor(ctx);
  drawStations(ctx, world);
  drawChef(ctx, world);
  drawPopups(ctx, world);
  drawOrderBoard(ctx, world);
  if (world.screen === 'play') drawHintBar(ctx, world);
  if (world.screen === 'title') drawTitleScreen(ctx, world);
  if (world.screen === 'over') drawGameOverScreen(ctx, world);
}
