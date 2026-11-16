// Gravity-well placement rules for Star Shepherd — pure geometry, no DOM.
// The player places wells by clicking, drags them before launch, and
// removes one with a right-click or a key. The solver uses these same
// rules, so a solved placement is always a legal placement.

import {
  PLACE_BOUNDS,
  WELL_MIN_SEPARATION,
  WELL_MIN_START_DISTANCE,
} from "./config.js";
import { vecDistance } from "./vector-math.js";

export function clampWellPosition(x, y) {
  return {
    x: Math.min(PLACE_BOUNDS.maxX, Math.max(PLACE_BOUNDS.minX, x)),
    y: Math.min(PLACE_BOUNDS.maxY, Math.max(PLACE_BOUNDS.minY, y)),
  };
}

export function wellPlacementIsLegal(wells, x, y, budget, level, ignoreIndex) {
  if (wells.length >= budget && ignoreIndex === undefined) return false;
  if (x < PLACE_BOUNDS.minX || x > PLACE_BOUNDS.maxX) return false;
  if (y < PLACE_BOUNDS.minY || y > PLACE_BOUNDS.maxY) return false;
  if (vecDistance(x, y, level.start.x, level.start.y) < WELL_MIN_START_DISTANCE) return false;
  for (let i = 0; i < wells.length; i += 1) {
    if (i === ignoreIndex) continue;
    if (vecDistance(x, y, wells[i].x, wells[i].y) < WELL_MIN_SEPARATION) return false;
  }
  return true;
}

export function placeWell(wells, x, y, budget, level) {
  const clamped = clampWellPosition(x, y);
  if (!wellPlacementIsLegal(wells, clamped.x, clamped.y, budget, level)) return null;
  return wells.concat([{ x: clamped.x, y: clamped.y }]);
}

export function moveWellTo(wells, index, x, y, level) {
  const clamped = clampWellPosition(x, y);
  if (!wellPlacementIsLegal(wells, clamped.x, clamped.y, wells.length, level, index)) {
    return wells;
  }
  const next = wells.slice();
  next[index] = { x: clamped.x, y: clamped.y };
  return next;
}

export function nearestWellIndex(wells, x, y, maxDistance) {
  let bestIndex = -1;
  let bestDistance = maxDistance;
  for (let i = 0; i < wells.length; i += 1) {
    const distance = vecDistance(x, y, wells[i].x, wells[i].y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function removeWellNear(wells, x, y, maxDistance) {
  const index = nearestWellIndex(wells, x, y, maxDistance);
  if (index < 0) return wells;
  return wells.slice(0, index).concat(wells.slice(index + 1));
}

export function removeLastWell(wells) {
  return wells.slice(0, -1);
}
