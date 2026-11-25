// Copper Pot Kitchen — screenshot staging. Each ?shot= scene starts from a
// fresh world at a fixed seed and plays the real rules forward for a fixed
// number of steps, steered by a small autopilot that walks the chef between
// stations and uses them. The same seed always gives the same frame, and
// every frame is a moment a real game could reach.
import { CHEF_SPEED, STATIONS, stationApproachPoint } from './config.js';
import { createWorld, forceOrder, STEP, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// The autopilot's plan is a list of steps. A step is one of:
//   { go: stationId }        walk to the station's front
//   { use: stationId }       walk there, then use it once
//   { waitChop: true }       stand still until the chopping finishes
//   { wait: seconds }        stand still for a while
//   { waitFor: fn }          stand still until fn(world) is true
function runPlan(world, plan, maxSeconds) {
  const maxSteps = Math.ceil(maxSeconds / STEP);
  // A step that makes no progress for this long is skipped: a stuck walk
  // must never eat the whole shot.
  const stepTimeout = Math.ceil(12 / STEP);
  let stepIndex = 0;
  let waitLeft = 0;
  let stepsOnCurrent = 0;
  let lastIndex = 0;
  for (let step = 0; step < maxSteps; step += 1) {
    if (world.screen !== 'play') break;
    if (stepIndex >= plan.length) break;
    if (stepIndex !== lastIndex) {
      stepsOnCurrent = 0;
      lastIndex = stepIndex;
    }
    stepsOnCurrent += 1;
    if (stepsOnCurrent > stepTimeout) {
      stepIndex += 1;
      stepsOnCurrent = 0;
      waitLeft = 0;
      continue;
    }
    const current = plan[stepIndex];
    if (current.wait !== undefined) {
      if (waitLeft <= 0) waitLeft = current.wait;
      waitLeft -= STEP;
      stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: false }, STEP);
      if (waitLeft <= 0) stepIndex += 1;
      continue;
    }
    if (current.waitChop) {
      stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: false }, STEP);
      if (!world.chef.chopping) stepIndex += 1;
      continue;
    }
    if (current.waitFor) {
      stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: false }, STEP);
      if (current.waitFor(world)) stepIndex += 1;
      continue;
    }
    const target = stationApproachPoint(current.go || current.use);
    const distance = Math.hypot(target.x - world.chef.x, target.y - world.chef.y);
    if (distance > 14) {
      // Walk toward the station in one fixed step.
      const dx = target.x - world.chef.x;
      const dy = target.y - world.chef.y;
      const length = Math.hypot(dx, dy) || 1;
      stepWorld(
        world,
        {
          moveX: (dx / length) * CHEF_SPEED,
          moveY: (dy / length) * CHEF_SPEED,
          target: null,
          interact: false,
        },
        STEP,
      );
      continue;
    }
    // Arrived: use the station once, then move on. The plan names the
    // station it means, so the use never lands on a neighbour.
    if (current.use) {
      stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: true, interactStation: current.use }, STEP);
      stepIndex += 1;
    } else {
      stepIndex += 1;
    }
  }
}

// The salad build: tomato and lettuce, chopped, plated. Leaves the plate
// finished and matching the salad order on the board.
function saladPlan() {
  return [
    { use: 'crateTomato' },
    { use: 'board' },
    { waitChop: true },
    { use: 'crateLettuce' },
    { use: 'board' },
    { waitChop: true },
    { use: 'assembly' },
  ];
}

// The burger build: bun, a cooked patty, chopped lettuce, plated.
function burgerPlan() {
  return [
    { use: 'cratePatty' },
    { use: 'stove' },
    { waitFor: (w) => w.burners.some((b) => b.state === 'done' || b.state === 'burnt') },
    { use: 'stove' },
    { use: 'crateBun' },
    { use: 'crateLettuce' },
    { use: 'board' },
    { waitChop: true },
    { use: 'assembly' },
  ];
}

// Set `world` to the named scene and return the screen to draw over it.
export function stageShot(name, seed) {
  const world = createWorld(seed);
  world.screen = 'play';
  world.best = 0;

  if (name === 'start') {
    // Title screen over a kitchen that is already alive: two orders on the
    // board and a half-built salad on the assembly plate.
    forceOrder(world, 'salad', 50);
    forceOrder(world, 'burger', 44);
    // One chopped tomato on the plate: a dish mid-assembly, but not a
    // finished one, so no SERVE badge glows through the title button.
    world.plate = [{ id: 'tomato', prep: 'chopped' }];
    world.chef.x = 640;
    world.chef.y = 300;
    world.time = 6;
    world.screen = 'title';
    return { world, screen: SCREEN_TITLE };
  }

  if (name === 'serve') {
    // Build a salad, serve it, and freeze just after the serve lands: the
    // score popup is up and the dish sits in the serving window.
    forceOrder(world, 'salad', 50);
    forceOrder(world, 'burger', 44);
    runPlan(world, saladPlan(), 120);
    runPlan(world, [{ use: 'assembly' }, { wait: 0.5 }], 30);
    return { world, screen: SCREEN_PLAY };
  }

  if (name === 'end') {
    // Serve one salad for a real score, then let the clock run out.
    forceOrder(world, 'salad', 50);
    forceOrder(world, 'burger', 44);
    runPlan(world, saladPlan(), 120);
    runPlan(world, [{ use: 'assembly' }], 30);
    world.timeLeft = 1.2;
    for (let i = 0; i < 600 && world.screen === 'play'; i += 1) {
      stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: false }, STEP);
    }
    return { world, screen: world.screen === 'over' ? SCREEN_OVER : SCREEN_PLAY };
  }

  // 'play' (and anything else): a busy mid-shift frame. Seed 7 builds a
  // salad and leaves it plated and ready to serve; other seeds build a
  // burger and freeze mid-chop or mid-cook.
  if (seed === 7) {
    forceOrder(world, 'salad', 50);
    forceOrder(world, 'burger', 44);
    runPlan(world, saladPlan(), 120);
    runPlan(world, [{ wait: 0.4 }], 10);
    return { world, screen: SCREEN_PLAY };
  }
  forceOrder(world, 'burger', 50);
  forceOrder(world, 'soup', 44);
  runPlan(world, burgerPlan(), 150);
  return { world, screen: SCREEN_PLAY };
}

// The station ids the autopilot may walk to, for the dossier outline.
export function shotStationIds() {
  return Object.keys(STATIONS);
}
