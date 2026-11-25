// Copper Pot Kitchen — deterministic random numbers. The whole game runs on
// one seeded generator (mulberry32) so a screenshot seed always replays the
// same orders, the same spawns and the same frame.
export function makeSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry from a list with the seeded generator.
export function pickRandom(random, list) {
  return list[Math.floor(random() * list.length)];
}

// A number in [min, max) from the seeded generator.
export function rangeRandom(random, min, max) {
  return min + random() * (max - min);
}
