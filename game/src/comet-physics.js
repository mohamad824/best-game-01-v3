// Comet physics for Star Shepherd — the single source of truth.
// Both the live flight and the trajectory predictor step through
// stepComet, so the dotted preview IS the outcome. Fixed timestep only:
// no wall clock, no randomness anywhere in this module.

import {
  BLACK_HOLE_DEFAULT_CAPTURE,
  BLACK_HOLE_DEFAULT_STRENGTH,
  BLACK_HOLE_SOFTENING,
  COMET_DRIFT_MARGIN,
  COMET_MAX_SPEED,
  HOME_STAR_COLLECT_RADIUS,
  SIM_DT,
  SIM_MAX_SECONDS,
  STAR_COLLECT_RADIUS,
  WELL_FALLOFF_RANGE,
  WELL_PULL_MAX,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./config.js";
import { clampSpeed, vecDistance } from "./vector-math.js";

export function createCometState(level) {
  return {
    x: level.start.x,
    y: level.start.y,
    vx: level.velocity.x,
    vy: level.velocity.y,
    fuel: level.fuel,
    collected: level.stars.map(() => false),
    starsCollected: 0,
    status: "flying",
    lossReason: null,
    steps: 0,
    minBlackHoleClearance: Infinity,
    minVoidClearance: Infinity,
    closestStarApproach: level.stars.map(() => Infinity),
  };
}

export function cloneCometState(state) {
  return {
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
    fuel: state.fuel,
    collected: state.collected.slice(),
    starsCollected: state.starsCollected,
    status: state.status,
    lossReason: state.lossReason,
    steps: state.steps,
    minBlackHoleClearance: state.minBlackHoleClearance,
    minVoidClearance: state.minVoidClearance,
    closestStarApproach: state.closestStarApproach.slice(),
  };
}

function gravityPull(ax, ay, px, py, strength, softening) {
  const dx = px - ax;
  const dy = py - ay;
  const distSq = dx * dx + dy * dy + softening * softening;
  const invDist = 1 / Math.sqrt(distSq);
  const invDistCubed = invDist * invDist * invDist;
  return { ax: strength * dx * invDistCubed, ay: strength * dy * invDistCubed };
}

function wellPull(stateX, stateY, wellX, wellY) {
  const dx = wellX - stateX;
  const dy = wellY - stateY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.001) return { ax: 0, ay: 0 };
  const falloff = WELL_FALLOFF_RANGE / (WELL_FALLOFF_RANGE + distance);
  const magnitude = WELL_PULL_MAX * falloff * falloff;
  return { ax: (magnitude * dx) / distance, ay: (magnitude * dy) / distance };
}

function collectStarsTouched(state, level) {
  for (let i = 0; i < level.stars.length; i += 1) {
    const star = level.stars[i];
    const distance = vecDistance(state.x, state.y, star.x, star.y);
    if (distance < state.closestStarApproach[i]) {
      state.closestStarApproach[i] = distance;
    }
    if (!state.collected[i]) {
      const radius = star.home ? HOME_STAR_COLLECT_RADIUS : STAR_COLLECT_RADIUS;
      if (distance <= radius) {
        state.collected[i] = true;
        state.starsCollected += 1;
      }
    }
  }
}

function checkBlackHoleCapture(state, level) {
  for (const hole of level.blackHoles) {
    const capture = hole.captureRadius || BLACK_HOLE_DEFAULT_CAPTURE;
    const distance = vecDistance(state.x, state.y, hole.x, hole.y);
    const clearance = distance - capture;
    if (clearance < state.minBlackHoleClearance) {
      state.minBlackHoleClearance = clearance;
    }
    if (distance <= capture) return true;
  }
  return false;
}

function checkVoidZoneEntry(state, level) {
  for (const zone of level.voidZones) {
    const distance = vecDistance(state.x, state.y, zone.x, zone.y);
    const clearance = distance - zone.radius;
    if (clearance < state.minVoidClearance) {
      state.minVoidClearance = clearance;
    }
    if (distance <= zone.radius) return true;
  }
  return false;
}

export function stepComet(state, level, wells) {
  if (state.status !== "flying") return state;

  let accelX = 0;
  let accelY = 0;
  for (const well of wells) {
    const pull = wellPull(state.x, state.y, well.x, well.y);
    accelX += pull.ax;
    accelY += pull.ay;
  }
  for (const hole of level.blackHoles) {
    const strength = hole.strength || BLACK_HOLE_DEFAULT_STRENGTH;
    const pull = gravityPull(state.x, state.y, hole.x, hole.y, strength, BLACK_HOLE_SOFTENING);
    accelX += pull.ax;
    accelY += pull.ay;
  }

  state.vx += accelX * SIM_DT;
  state.vy += accelY * SIM_DT;
  const clamped = clampSpeed(state.vx, state.vy, COMET_MAX_SPEED);
  state.vx = clamped.vx;
  state.vy = clamped.vy;
  state.x += state.vx * SIM_DT;
  state.y += state.vy * SIM_DT;
  state.fuel -= SIM_DT;
  state.steps += 1;

  if (checkBlackHoleCapture(state, level)) {
    state.status = "lost";
    state.lossReason = "blackhole";
    return state;
  }
  if (checkVoidZoneEntry(state, level)) {
    state.status = "lost";
    state.lossReason = "void";
    return state;
  }

  collectStarsTouched(state, level);
  if (state.starsCollected >= level.stars.length) {
    state.status = "won";
    return state;
  }

  if (state.fuel <= 0) {
    state.fuel = 0;
    state.status = "lost";
    state.lossReason = "fuel";
    return state;
  }

  if (
    state.x < -COMET_DRIFT_MARGIN ||
    state.x > WORLD_WIDTH + COMET_DRIFT_MARGIN ||
    state.y < -COMET_DRIFT_MARGIN ||
    state.y > WORLD_HEIGHT + COMET_DRIFT_MARGIN
  ) {
    state.status = "lost";
    state.lossReason = "drifted";
    return state;
  }

  return state;
}

export function simulateFlight(level, wells, fromState) {
  const state = fromState ? cloneCometState(fromState) : createCometState(level);
  const maxSteps = Math.floor(SIM_MAX_SECONDS / SIM_DT);
  const trajectory = [{ x: state.x, y: state.y }];
  const sampleEvery = 6;
  while (state.status === "flying" && state.steps < maxSteps) {
    stepComet(state, level, wells);
    if (state.steps % sampleEvery === 0 || state.status !== "flying") {
      trajectory.push({ x: state.x, y: state.y });
    }
  }
  if (state.status === "flying") {
    state.status = "lost";
    state.lossReason = "fuel";
    state.fuel = 0;
  }
  return {
    status: state.status,
    lossReason: state.lossReason,
    starsCollected: state.starsCollected,
    starsTotal: level.stars.length,
    fuelRemaining: Math.max(0, state.fuel),
    steps: state.steps,
    endX: state.x,
    endY: state.y,
    endVx: state.vx,
    endVy: state.vy,
    collected: state.collected.slice(),
    trajectory,
    minBlackHoleClearance: state.minBlackHoleClearance,
    minVoidClearance: state.minVoidClearance,
    closestStarApproach: state.closestStarApproach.slice(),
  };
}

export function flightOutcomeLabel(result) {
  if (result.status === "won") return "all stars gathered";
  if (result.lossReason === "blackhole") return "captured by a black hole";
  if (result.lossReason === "void") return "destroyed in a void zone";
  if (result.lossReason === "drifted") return "drifted beyond the starfield";
  return "fuel ran out";
}
