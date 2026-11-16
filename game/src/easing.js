// Easing curves for Star Shepherd's motion feel.
// Entrances decelerate, exits accelerate, on-screen motion eases in-out,
// and feedback pops with a soft overshoot. Render-only: easing never
// touches the simulation.

export function easeOutCubic(t) {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeInCubic(t) {
  return t * t * t;
}

export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  const u = 1 - t;
  return 1 - 4 * u * u * u;
}

export function easeOutBack(t) {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function easePulse(t, frequency) {
  return 0.5 + 0.5 * Math.sin(t * frequency);
}

export function dampedSpringSettle(t) {
  return 1 - Math.exp(-6 * t) * Math.cos(9 * t);
}
