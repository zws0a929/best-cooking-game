// Copper Pot Kitchen — sound. Every sound is synthesised with WebAudio:
// short oscillator blips and filtered noise bursts, no audio files. The
// context is created lazily on the first player gesture so the page never
// needs autoplay permission, and screenshot staging never touches it.
let audioContext = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;

// A sleepy pentatonic kitchen tune: bass note plus a plucked melody note.
const MELODY = [523, 587, 659, 784, 880, 784, 659, 587];
const BASS = [131, 98, 110, 131, 98, 110, 123, 98];

function ensureAudioContext() {
  if (audioContext) return audioContext;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  } catch {
    audioContext = null;
  }
  return audioContext;
}

// Warm the context up from a user gesture (key or click).
export function unlockAudio() {
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopMusic();
  else startMusic();
  return muted;
}

export function isMuted() {
  return muted;
}

// One short tone: frequency slides from `from` to `to` over `seconds`.
function playTone(from, to, seconds, type, volume, delay = 0) {
  if (muted) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  } catch {
    // Sound is garnish: a failed blip never breaks the game.
  }
}

// A burst of filtered noise, for chops, sizzles and thuds.
function playNoise(seconds, volume, filterFrequency, delay = 0) {
  if (muted) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
  } catch {
    // See playTone.
  }
}

export function playPickupSound() {
  playTone(520, 780, 0.09, 'sine', 0.12);
}

export function playPlaceSound() {
  playTone(300, 210, 0.08, 'triangle', 0.12);
  playNoise(0.05, 0.06, 900);
}

export function playChopSound() {
  playNoise(0.07, 0.22, 2400);
  playTone(180, 90, 0.06, 'square', 0.05);
}

export function playChopDoneSound() {
  playTone(660, 660, 0.07, 'sine', 0.12);
  playTone(880, 880, 0.09, 'sine', 0.12, 0.07);
}

export function playSizzleSound() {
  playNoise(0.35, 0.05, 5200);
}

export function playCookDoneSound() {
  playTone(740, 740, 0.08, 'sine', 0.12);
  playTone(988, 988, 0.12, 'sine', 0.12, 0.08);
}

export function playServeSound() {
  playTone(523, 523, 0.1, 'sine', 0.14);
  playTone(659, 659, 0.1, 'sine', 0.14, 0.09);
  playTone(784, 784, 0.16, 'sine', 0.14, 0.18);
}

export function playOrderSound() {
  playTone(880, 660, 0.12, 'triangle', 0.1);
  playTone(660, 880, 0.12, 'triangle', 0.08, 0.12);
}

export function playFailSound() {
  playTone(220, 110, 0.35, 'sawtooth', 0.1);
}

export function playBurnSound() {
  playTone(160, 70, 0.4, 'sawtooth', 0.1);
  playNoise(0.25, 0.08, 700);
}

export function playClickSound() {
  playTone(700, 700, 0.05, 'sine', 0.08);
}

export function playGameOverSound() {
  playTone(392, 392, 0.16, 'triangle', 0.14);
  playTone(330, 330, 0.16, 'triangle', 0.14, 0.16);
  playTone(262, 196, 0.4, 'triangle', 0.14, 0.32);
}

// The background tune: one step every 320 ms, a bass note on every step
// and a melody note on every other step. Quiet on purpose.
function musicTick() {
  if (muted) return;
  const ctx = ensureAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const bass = BASS[musicStep % BASS.length];
  playTone(bass, bass, 0.3, 'triangle', 0.05);
  if (musicStep % 2 === 0) {
    const note = MELODY[(musicStep / 2) % MELODY.length];
    playTone(note, note, 0.22, 'sine', 0.04);
  }
  musicStep += 1;
}

export function startMusic() {
  if (musicTimer !== null || muted) return;
  musicTimer = window.setInterval(musicTick, 320);
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
