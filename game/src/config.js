// Copper Pot Kitchen — configuration: canvas size, kitchen layout, ingredients,
// recipes, timing and scoring. Every number the game balances on lives here.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 480;

// One shift lasts two and a half minutes of kitchen time.
export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_CARRY = 3;
export const MAX_ORDERS = 4;

// How long a fresh order waits before the customer walks out.
export const ORDER_PATIENCE_MIN = 42;
export const ORDER_PATIENCE_MAX = 58;
// Orders arrive faster as the shift goes on.
export const ORDER_SPAWN_START = 15;
export const ORDER_SPAWN_END = 8;

// Chopping one ingredient and cooking one patty, in seconds.
export const CHOP_SECONDS = 2.6;
export const COOK_SECONDS = 6;
export const BURN_SECONDS = 12;
export const SOUP_COOK_SECONDS = 5;

// The chef's walking speed in pixels per second.
export const CHEF_SPEED = 250;
export const CHEF_RADIUS = 17;
// How close the chef must stand to a station to use it.
export const INTERACT_RANGE = 56;

// The floor the chef walks on: below the order board, inside the walls.
export const FLOOR = { x: 14, y: 96, width: 1252, height: 372 };

// --- Ingredients -----------------------------------------------------------
// prep: 'raw' (straight from the crate), 'chopped' (off the board),
// 'cooked' (off the stove), 'soup' (a finished pot of soup).
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5484d', choppable: true, cookable: false },
  lettuce: { name: 'Lettuce', color: '#46a758', choppable: true, cookable: false },
  onion: { name: 'Onion', color: '#b07fd4', choppable: true, cookable: false },
  cheese: { name: 'Cheese', color: '#f5b83d', choppable: false, cookable: false },
  bun: { name: 'Bun', color: '#d9a05b', choppable: false, cookable: false },
  patty: { name: 'Patty', color: '#8a5a3b', choppable: false, cookable: true },
};

// A recipe is a list of prepared items, in the order they are stacked.
export const RECIPES = {
  salad: {
    name: 'Garden Salad',
    short: 'Salad',
    base: 20,
    needs: [
      { id: 'tomato', prep: 'chopped' },
      { id: 'lettuce', prep: 'chopped' },
    ],
  },
  burger: {
    name: 'Copper Burger',
    short: 'Burger',
    base: 35,
    needs: [
      { id: 'bun', prep: 'raw' },
      { id: 'patty', prep: 'cooked' },
      { id: 'lettuce', prep: 'chopped' },
    ],
  },
  melt: {
    name: 'Cheesy Melt',
    short: 'Melt',
    base: 30,
    needs: [
      { id: 'bun', prep: 'raw' },
      { id: 'patty', prep: 'cooked' },
      { id: 'cheese', prep: 'raw' },
    ],
  },
  soup: {
    name: 'Tomato Soup',
    short: 'Soup',
    base: 30,
    needs: [{ id: 'soup', prep: 'soup' }],
  },
};
export const RECIPE_IDS = ['salad', 'burger', 'melt', 'soup'];

// --- Kitchen stations ------------------------------------------------------
// Crates run along the top of the kitchen; the board is on the left wall,
// the stove on the right wall, the assembly counter and serving window
// along the bottom, and the bin in the bottom-left corner.
export const STATIONS = {
  crateTomato: { kind: 'crate', ingredient: 'tomato', label: 'Tomato', x: 24, y: 104, w: 92, h: 48 },
  crateLettuce: { kind: 'crate', ingredient: 'lettuce', label: 'Lettuce', x: 124, y: 104, w: 92, h: 48 },
  crateOnion: { kind: 'crate', ingredient: 'onion', label: 'Onion', x: 224, y: 104, w: 92, h: 48 },
  crateCheese: { kind: 'crate', ingredient: 'cheese', label: 'Cheese', x: 324, y: 104, w: 92, h: 48 },
  crateBun: { kind: 'crate', ingredient: 'bun', label: 'Bun', x: 424, y: 104, w: 92, h: 48 },
  cratePatty: { kind: 'crate', ingredient: 'patty', label: 'Patty', x: 524, y: 104, w: 92, h: 48 },
  board: { kind: 'board', label: 'Chopping Board', x: 24, y: 240, w: 170, h: 96 },
  stove: { kind: 'stove', label: 'Stove', x: 1086, y: 240, w: 170, h: 96 },
  assembly: { kind: 'assembly', label: 'Assembly Counter', x: 470, y: 356, w: 340, h: 96 },
  window: { kind: 'window', label: 'Serving Window', x: 1020, y: 356, w: 236, h: 96 },
  bin: { kind: 'bin', label: 'Bin', x: 24, y: 356, w: 110, h: 96 },
};

// The two burners on the stove, in station-local coordinates.
export const BURNERS = [
  { dx: 26, dy: 30, r: 26 },
  { dx: 118, dy: 30, r: 26 },
];

// Where the chef stands to use a station: the centre of the side that
// faces the open floor.
export function stationApproachPoint(stationId) {
  const s = STATIONS[stationId];
  if (!s) return { x: VIEW_WIDTH / 2, y: 300 };
  if (s.kind === 'crate') return { x: s.x + s.w / 2, y: s.y + s.h + 34 };
  if (s.kind === 'board') return { x: s.x + s.w + 34, y: s.y + s.h / 2 };
  if (s.kind === 'stove') return { x: s.x - 34, y: s.y + s.h / 2 };
  if (s.kind === 'assembly') return { x: s.x + s.w / 2, y: s.y - 34 };
  if (s.kind === 'window') return { x: s.x + s.w / 2, y: s.y - 34 };
  if (s.kind === 'bin') return { x: s.x + s.w + 34, y: s.y + s.h / 2 };
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

// The centre of a station's rectangle, for drawing and distance checks.
export function stationCentre(stationId) {
  const s = STATIONS[stationId];
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}
