// Copper Pot Kitchen — entry point. Boots the canvas, wires keyboard and
// mouse, and runs the loop. With ?shot=start|play|serve|end&seed=N it
// instead stages one deterministic scene and draws it once, so a headless
// browser can screenshot exactly that frame.
import { VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { createWorld, EVENT_OVER, STEP, startShift, stepWorld } from './world.js';
import { drawFrame } from './render.js';
import {
  attachInput,
  clearMouseTarget,
  consumeAutoInteract,
  readInput,
  targetReached,
} from './input.js';
import { stageShot } from './shots.js';
import { playClickSound, playGameOverSound, toggleMute, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed') || '7');
const seed = Number.isFinite(seedParam) ? seedParam : 7;

// --- Screenshot staging -----------------------------------------------------
// A shot scene is staged synchronously and drawn once; no loop, no audio,
// no wall-clock dependence, so the frame is identical every run.
if (shotName) {
  const staged = stageShot(shotName, seed);
  drawFrame(ctx, staged.world);
  window.__shotReady = true;
} else {
  runGame();
}

function runGame() {
  const world = createWorld(20261125);
  world.screen = 'title';
  let lastTime = performance.now();
  let accumulator = 0;

  function onConfirm() {
    unlockAudio();
    if (world.screen === 'title') {
      playClickSound();
      startShift(world);
    }
  }

  function onRestart() {
    if (world.screen === 'over') {
      unlockAudio();
      playClickSound();
      startShift(world);
    }
  }

  function onMute() {
    world.muted = toggleMute();
  }

  function onPointerDown() {
    unlockAudio();
    if (world.screen === 'title') {
      playClickSound();
      startShift(world);
    }
  }

  attachInput(canvas, { onConfirm, onRestart, onMute, onPointerDown });

  function frame(now) {
    const elapsed = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += elapsed;
    const input = readInput();
    let firstStep = true;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      // An interact press is an edge: it fires on the first sub-step only,
      // so one key press never picks up three tomatoes.
      const stepInput = firstStep ? input : { ...input, interact: false };
      firstStep = false;
      if (world.screen === 'play') {
        // A mouse click on a station uses it the moment the chef arrives.
        if (input.target && targetReached(world.chef)) {
          const station = consumeAutoInteract();
          clearMouseTarget();
          stepWorld(world, { moveX: 0, moveY: 0, target: null, interact: station !== null, interactStation: station }, STEP);
        } else {
          const events = stepWorld(world, stepInput, STEP);
          if (events & EVENT_OVER) playGameOverSound();
        }
      } else {
        // Title and game-over screens still animate (the world clock runs
        // so the title pulse and the kitchen behind it stay alive).
        world.time += STEP;
      }
    }
    drawFrame(ctx, world);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
