// Copper Pot Kitchen — input. Keyboard (WASD / arrows to walk, E or Space
// to use a station, Enter to start, M to mute) and mouse (click a spot to
// walk there, click a station to walk to it and use it). The module keeps
// the raw key state; the game loop reads a normalised snapshot each frame.
import { STATIONS, stationApproachPoint } from './config.js';

const keysDown = new Set();
let mouseTarget = null;
let autoInteractStation = null;
let interactQueued = false;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function attachInput(canvas, handlers) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (MOVE_KEYS[event.code]) event.preventDefault();
      return;
    }
    keysDown.add(event.code);
    if (MOVE_KEYS[event.code]) event.preventDefault();
    if (event.code === 'KeyE' || event.code === 'Space') {
      interactQueued = true;
      mouseTarget = null;
      autoInteractStation = null;
      event.preventDefault();
    }
    if (event.code === 'Enter') handlers.onConfirm();
    if (event.code === 'KeyM') handlers.onMute();
    if (event.code === 'KeyR') handlers.onRestart();
  });
  window.addEventListener('keyup', (event) => {
    keysDown.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keysDown.clear();
    mouseTarget = null;
    autoInteractStation = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    handlers.onPointerDown(x, y);
    // A click on (or very near) a station walks the chef to its front and
    // uses it on arrival; a click on open floor just walks there.
    let clickedStation = null;
    for (const [id, station] of Object.entries(STATIONS)) {
      if (x >= station.x - 8 && x <= station.x + station.w + 8 && y >= station.y - 8 && y <= station.y + station.h + 8) {
        clickedStation = id;
        break;
      }
    }
    if (clickedStation) {
      mouseTarget = stationApproachPoint(clickedStation);
      autoInteractStation = clickedStation;
    } else {
      mouseTarget = { x, y };
      autoInteractStation = null;
    }
  });
}

// The normalised input snapshot for one simulation step.
export function readInput() {
  let moveX = 0;
  let moveY = 0;
  for (const code of keysDown) {
    const dir = MOVE_KEYS[code];
    if (dir) {
      moveX += dir[0];
      moveY += dir[1];
    }
  }
  const snapshot = {
    moveX,
    moveY,
    target: mouseTarget,
    interact: interactQueued,
    autoStation: autoInteractStation,
  };
  interactQueued = false;
  return snapshot;
}

// Has the chef arrived at the mouse target? Callers clear the target then.
export function targetReached(chef, threshold = 10) {
  if (!mouseTarget) return false;
  return Math.hypot(mouseTarget.x - chef.x, mouseTarget.y - chef.y) <= threshold;
}

export function clearMouseTarget() {
  mouseTarget = null;
  autoInteractStation = null;
}

export function consumeAutoInteract() {
  const station = autoInteractStation;
  autoInteractStation = null;
  return station;
}

export function isKeyDown(code) {
  return keysDown.has(code);
}
