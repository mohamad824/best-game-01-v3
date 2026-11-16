// Seeded random numbers for Star Shepherd.
// Every random-looking thing in the game (starfield, nebulae, dust, bursts)
// comes from one of these generators, so a level renders the same way
// every time. The simulation itself uses no randomness at all.

export function hashSeedFromText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextSeededFloat() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(random, min, max) {
  return min + (max - min) * random();
}

export function seededInteger(random, min, max) {
  return Math.floor(seededRange(random, min, max + 1));
}

export function seededPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
