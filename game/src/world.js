// Copper Pot Kitchen — the world: orders, the chef, the stations and the
// rules that turn ingredients into served dishes. Rendering never touches
// this file's internals except through the state it returns.
import {
  BURN_SECONDS,
  CHEF_RADIUS,
  CHEF_SPEED,
  CHOP_SECONDS,
  COOK_SECONDS,
  FLOOR,
  INGREDIENTS,
  INTERACT_RANGE,
  MAX_CARRY,
  MAX_HEARTS,
  MAX_ORDERS,
  ORDER_PATIENCE_MAX,
  ORDER_PATIENCE_MIN,
  ORDER_SPAWN_END,
  ORDER_SPAWN_START,
  RECIPES,
  RECIPE_IDS,
  SHIFT_SECONDS,
  SOUP_COOK_SECONDS,
  STATIONS,
  stationCentre,
} from './config.js';
import { makeSeededRandom, pickRandom, rangeRandom } from './random.js';
import {
  playBurnSound,
  playChopDoneSound,
  playChopSound,
  playCookDoneSound,
  playFailSound,
  playOrderSound,
  playPickupSound,
  playPlaceSound,
  playServeSound,
  playSizzleSound,
} from './audio.js';

export const EVENT_NONE = 0;
export const EVENT_OVER = 1;
export const EVENT_SERVED = 2;
export const EVENT_EXPIRED = 4;
export const STEP = 1 / 60;

let nextOrderId = 1;

function makeOrder(random, recipeId, patienceSeconds) {
  const recipe = RECIPES[recipeId];
  return {
    id: nextOrderId,
    recipeId,
    name: recipe.name,
    short: recipe.short,
    patience: patienceSeconds,
    maxPatience: patienceSeconds,
    state: 'active',
    bornAt: 0,
  };
}

// A fresh, empty kitchen for one shift.
export function createWorld(seed) {
  nextOrderId = 1;
  const random = makeSeededRandom(seed);
  return {
    seed,
    random,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    screen: 'title',
    score: 0,
    earned: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    hearts: MAX_HEARTS,
    orders: [],
    spawnIn: 4,
    chef: {
      x: 640,
      y: 300,
      facing: 1,
      carry: [],
      chopping: null,
      walking: false,
    },
    burners: [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ],
    plate: [],
    servedDish: null,
    servedDishTtl: 0,
    popups: [],
    best: 0,
    overReason: '',
    muted: false,
  };
}

// Put a fixed order on the board (used by screenshot staging so the
// cover frame always shows the dish the autopilot is building).
export function forceOrder(world, recipeId, patienceSeconds = 50) {
  const order = makeOrder(world.random, recipeId, patienceSeconds);
  order.bornAt = world.time;
  world.orders.push(order);
  return order;
}

function spawnOrder(world) {
  if (world.orders.filter((o) => o.state === 'active').length >= MAX_ORDERS) return;
  const progress = 1 - world.timeLeft / SHIFT_SECONDS;
  const patience = rangeRandom(world.random, ORDER_PATIENCE_MIN, ORDER_PATIENCE_MAX);
  const order = makeOrder(world, pickRandom(world.random, RECIPE_IDS), patience);
  order.bornAt = world.time;
  world.orders.push(order);
  playOrderSound();
}

function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color, ttl: 1.4 });
  if (world.popups.length > 8) world.popups.shift();
}

function scoreServe(world, order) {
  const recipe = RECIPES[order.recipeId];
  const tip = Math.round(10 * (order.patience / order.maxPatience));
  const comboBonus = world.combo * 5;
  const points = recipe.base + tip + comboBonus;
  world.score += points;
  world.earned += points;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const centre = stationCentre('window');
  addPopup(world, centre.x, centre.y - 60, `+${points}`, '#ffd166');
  if (world.combo >= 2) {
    addPopup(world, centre.x, centre.y - 88, `COMBO x${world.combo}`, '#ff8fa3');
  }
  world.servedDish = { recipeId: order.recipeId, name: recipe.name };
  world.servedDishTtl = 3;
  playServeSound();
}

function loseHeart(world, reason) {
  world.hearts -= 1;
  world.combo = 0;
  addPopup(world, 640, 150, reason, '#ff6b6b');
  playFailSound();
  if (world.hearts <= 0) endShift(world, 'Out of hearts — too many walkouts!');
}

function endShift(world, reason) {
  if (world.screen === 'over') return;
  world.screen = 'over';
  world.overReason = reason;
  world.best = Math.max(world.best, world.score);
}

// Does the plate hold exactly what this recipe needs, in any order?
function plateMatchesRecipe(plate, recipeId) {
  const needs = RECIPES[recipeId].needs;
  if (plate.length !== needs.length) return false;
  const remaining = needs.map((n) => `${n.id}:${n.prep}`);
  for (const item of plate) {
    const key = `${item.id}:${item.prep}`;
    const index = remaining.indexOf(key);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

function matchingOrder(world) {
  for (const order of world.orders) {
    if (order.state === 'active' && plateMatchesRecipe(world.plate, order.recipeId)) return order;
  }
  return null;
}

// The nearest station the chef can reach from where they stand.
export function nearestStationInRange(world) {
  const chef = world.chef;
  let best = null;
  let bestDistance = Infinity;
  for (const [id, station] of Object.entries(STATIONS)) {
    const dx = Math.max(station.x - chef.x, 0, chef.x - (station.x + station.w));
    const dy = Math.max(station.y - chef.y, 0, chef.y - (station.y + station.h));
    const distance = Math.hypot(dx, dy);
    if (distance <= INTERACT_RANGE && distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

function takeFromCrate(world, station) {
  const chef = world.chef;
  if (chef.carry.length >= MAX_CARRY) {
    addPopup(world, chef.x, chef.y - 40, 'Hands full!', '#ffd166');
    return;
  }
  chef.carry.push({ id: station.ingredient, prep: 'raw' });
  playPickupSound();
}

function startChopping(world) {
  const chef = world.chef;
  const index = chef.carry.findIndex((item) => INGREDIENTS[item.id].choppable && item.prep === 'raw');
  if (index === -1) {
    addPopup(world, chef.x, chef.y - 40, 'Need something to chop', '#ffd166');
    return;
  }
  chef.chopping = { itemIndex: index, progress: 0, total: CHOP_SECONDS };
  playChopSound();
}

function finishChopping(world) {
  const chef = world.chef;
  const chopping = chef.chopping;
  if (!chopping) return;
  const item = chef.carry[chopping.itemIndex];
  if (item) item.prep = 'chopped';
  chef.chopping = null;
  playChopDoneSound();
  addPopup(world, chef.x, chef.y - 40, 'Chopped!', '#8ce99a');
}

function useStove(world) {
  const chef = world.chef;
  // First, collect anything finished or burnt.
  for (let i = 0; i < world.burners.length; i += 1) {
    const burner = world.burners[i];
    if (burner.state === 'done' || burner.state === 'burnt') {
      if (chef.carry.length >= MAX_CARRY) {
        addPopup(world, chef.x, chef.y - 40, 'Hands full!', '#ffd166');
        return;
      }
      const item = burner.item;
      if (burner.state === 'burnt') {
        chef.carry.push({ id: item.id, prep: 'burnt' });
        addPopup(world, chef.x, chef.y - 40, 'Burnt! Bin it!', '#ff6b6b');
      } else {
        chef.carry.push(item);
        addPopup(world, chef.x, chef.y - 40, 'Hot off the stove!', '#8ce99a');
      }
      burner.item = null;
      burner.progress = 0;
      burner.state = 'empty';
      playPickupSound();
      return;
    }
  }
  // Then, start cooking: a raw patty, or a pot of soup from chopped
  // tomato + chopped onion carried together.
  const pattyIndex = chef.carry.findIndex((item) => item.id === 'patty' && item.prep === 'raw');
  const tomatoIndex = chef.carry.findIndex((item) => item.id === 'tomato' && item.prep === 'chopped');
  const onionIndex = chef.carry.findIndex((item) => item.id === 'onion' && item.prep === 'chopped');
  const free = world.burners.find((b) => b.state === 'empty');
  if (!free) {
    addPopup(world, chef.x, chef.y - 40, 'Stove is full', '#ffd166');
    return;
  }
  if (pattyIndex !== -1) {
    free.item = chef.carry.splice(pattyIndex, 1)[0];
    free.progress = 0;
    free.state = 'cooking';
    playSizzleSound();
    return;
  }
  if (tomatoIndex !== -1 && onionIndex !== -1) {
    chef.carry.splice(Math.max(tomatoIndex, onionIndex), 1);
    chef.carry.splice(Math.min(tomatoIndex, onionIndex), 1);
    free.item = { id: 'soup', prep: 'cooking' };
    free.progress = 0;
    free.state = 'cooking';
    playSizzleSound();
    addPopup(world, chef.x, chef.y - 40, 'Soup is on!', '#8ce99a');
    return;
  }
  addPopup(world, chef.x, chef.y - 40, 'Need a patty or soup veg', '#ffd166');
}

function useAssembly(world) {
  const chef = world.chef;
  const order = matchingOrder(world);
  if (order && world.plate.length > 0) {
    order.state = 'served';
    world.plate = [];
    scoreServe(world, order);
    return;
  }
  if (chef.carry.length === 0) {
    addPopup(world, chef.x, chef.y - 40, 'Nothing to plate', '#ffd166');
    return;
  }
  const space = 3 - world.plate.length;
  const moved = chef.carry.splice(0, space);
  world.plate.push(...moved);
  playPlaceSound();
}

function useBin(world) {
  const chef = world.chef;
  if (chef.carry.length === 0) return;
  chef.carry = [];
  playPlaceSound();
  addPopup(world, chef.x, chef.y - 40, 'Binned', '#adb5bd');
}

// The context action for the station the chef is standing at. When the
// caller knows which station it meant (the autopilot's plan, or the station
// the player clicked), that station wins over the nearest one, so a crate
// standing close to the board is never mistaken for the board.
export function interact(world, stationId = null) {
  if (world.screen !== 'play') return;
  if (world.chef.chopping) return;
  let station = null;
  if (stationId && STATIONS[stationId]) {
    const target = STATIONS[stationId];
    const dx = Math.max(target.x - world.chef.x, 0, world.chef.x - (target.x + target.w));
    const dy = Math.max(target.y - world.chef.y, 0, world.chef.y - (target.y + target.h));
    if (Math.hypot(dx, dy) <= INTERACT_RANGE) station = stationId;
  }
  if (!station) station = nearestStationInRange(world);
  if (!station) return;
  const stationDef = STATIONS[station];
  if (stationDef.kind === 'crate') takeFromCrate(world, stationDef);
  else if (stationDef.kind === 'board') startChopping(world);
  else if (stationDef.kind === 'stove') useStove(world);
  else if (stationDef.kind === 'assembly') useAssembly(world);
  else if (stationDef.kind === 'bin') useBin(world);
}

// Move the chef toward a point, sliding around station rectangles.
function moveChefToward(world, targetX, targetY, dt) {
  const chef = world.chef;
  const dx = targetX - chef.x;
  const dy = targetY - chef.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return true;
  const step = Math.min(distance, CHEF_SPEED * dt);
  let nextX = chef.x + (dx / distance) * step;
  let nextY = chef.y + (dy / distance) * step;
  chef.facing = dx < -2 ? -1 : dx > 2 ? 1 : chef.facing;
  chef.walking = true;
  // Clamp to the floor, then push out of any station rectangle.
  nextX = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.width - CHEF_RADIUS, nextX));
  nextY = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.height - CHEF_RADIUS, nextY));
  for (const station of Object.values(STATIONS)) {
    const closestX = Math.max(station.x, Math.min(nextX, station.x + station.w));
    const closestY = Math.max(station.y, Math.min(nextY, station.y + station.h));
    const pushX = nextX - closestX;
    const pushY = nextY - closestY;
    const pushDistance = Math.hypot(pushX, pushY);
    if (pushDistance < CHEF_RADIUS && pushDistance > 0) {
      nextX = closestX + (pushX / pushDistance) * CHEF_RADIUS;
      nextY = closestY + (pushY / pushDistance) * CHEF_RADIUS;
    } else if (pushDistance === 0) {
      nextY = station.y - CHEF_RADIUS;
    }
  }
  chef.x = nextX;
  chef.y = nextY;
  return distance - step < 4;
}

// One fixed simulation step. `input` is { moveX, moveY, target, interact,
// autoStation }: keyboard direction, an optional mouse target, and an
// edge-triggered interact request. Returns an event bitmask.
export function stepWorld(world, input, dt) {
  let events = EVENT_NONE;
  if (world.screen !== 'play') return events;
  world.time += dt;
  world.timeLeft -= dt;

  // Orders arrive on a quickening schedule while the shift runs.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    spawnOrder(world);
    const progress = 1 - world.timeLeft / SHIFT_SECONDS;
    world.spawnIn = ORDER_SPAWN_START + (ORDER_SPAWN_END - ORDER_SPAWN_START) * progress;
  }

  // Patience runs out; a walkout costs a heart and the combo.
  for (const order of world.orders) {
    if (order.state !== 'active') continue;
    order.patience -= dt;
    if (order.patience <= 0) {
      order.state = 'expired';
      events |= EVENT_EXPIRED;
      loseHeart(world, `${order.name} walked out!`);
      if (world.screen !== 'play') return events | EVENT_OVER;
    }
  }
  world.orders = world.orders.filter((o) => o.state === 'active' || world.time - o.bornAt < 2.5);

  // The chef walks: a mouse target wins over the keys.
  world.chef.walking = false;
  if (world.chef.chopping) {
    const chopping = world.chef.chopping;
    chopping.progress += dt;
    if (Math.floor(chopping.progress * 4) !== Math.floor((chopping.progress - dt) * 4)) playChopSound();
    if (chopping.progress >= chopping.total) finishChopping(world);
  } else if (input.target) {
    moveChefToward(world, input.target.x, input.target.y, dt);
  } else if (input.moveX !== 0 || input.moveY !== 0) {
    const length = Math.hypot(input.moveX, input.moveY) || 1;
    moveChefToward(
      world,
      world.chef.x + (input.moveX / length) * CHEF_SPEED * dt * 4,
      world.chef.y + (input.moveY / length) * CHEF_SPEED * dt * 4,
      dt,
    );
  }

  if (input.interact) interact(world, input.interactStation || null);

  // Burners cook, finish, then burn.
  for (const burner of world.burners) {
    if (burner.state !== 'cooking' || !burner.item) continue;
    burner.progress += dt;
    const doneAt = burner.item.id === 'soup' ? SOUP_COOK_SECONDS : COOK_SECONDS;
    if (burner.progress >= doneAt && burner.state === 'cooking') {
      burner.state = 'done';
      if (burner.item.id === 'soup') burner.item = { id: 'soup', prep: 'soup' };
      else burner.item.prep = 'cooked';
      playCookDoneSound();
    }
    if (burner.progress >= BURN_SECONDS && burner.state === 'done') {
      burner.state = 'burnt';
      burner.item.prep = 'burnt';
      playBurnSound();
      addPopup(world, stationCentre('stove').x, stationCentre('stove').y - 60, 'Burnt!', '#ff6b6b');
    }
  }

  if (world.servedDishTtl > 0) world.servedDishTtl -= dt;
  for (const popup of world.popups) popup.ttl -= dt;
  world.popups = world.popups.filter((p) => p.ttl > 0);

  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    endShift(world, 'Shift over!');
    return events | EVENT_OVER;
  }
  return events;
}

// Start a fresh shift from the title screen.
export function startShift(world) {
  const fresh = createWorld(world.seed);
  fresh.best = world.best;
  fresh.screen = 'play';
  Object.assign(world, fresh);
  world.screen = 'play';
  spawnOrder(world);
  world.spawnIn = ORDER_SPAWN_START;
}
