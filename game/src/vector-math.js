// Small vector helpers for the comet physics.
// Plain {x, y} objects throughout; no allocation-heavy classes, no DOM.

export function vecLength(x, y) {
  return Math.sqrt(x * x + y * y);
}

export function vecDistance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function vecDistanceSquared(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function vecNormalize(x, y) {
  const length = vecLength(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

export function vecScale(x, y, scale) {
  return { x: x * scale, y: y * scale };
}

export function vecAdd(ax, ay, bx, by) {
  return { x: ax + bx, y: ay + by };
}

export function clampSpeed(vx, vy, maxSpeed) {
  const speed = vecLength(vx, vy);
  if (speed <= maxSpeed) return { vx, vy };
  const scale = maxSpeed / speed;
  return { vx: vx * scale, vy: vy * scale };
}

export function clampNumber(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function lerpNumber(from, to, amount) {
  return from + (to - from) * amount;
}
