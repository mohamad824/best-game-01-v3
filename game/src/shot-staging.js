// Screenshot staging for Star Shepherd — deterministic setups that put
// the real game into exact states for its four screenshots. Staging
// only ever uses the game's own state, physics, and renderers: the
// shots are real renders, never composites. Default load (no params)
// always shows the title screen.

import { SIM_DT } from "./config.js";
import { createCometState, stepComet } from "./comet-physics.js";

export function parseShotParams(queryString) {
  const params = new URLSearchParams(queryString);
  const shot = params.get("shot");
  if (!shot) return null;
  const levelNumber = Number(params.get("level") || "1");
  const levelIndex = Math.max(0, Math.min(9, Math.floor(levelNumber) - 1));
  const wells = parsePointList(params.get("wells"));
  const ghost = parseSinglePoint(params.get("ghost"));
  const steps = Math.max(0, Math.floor(Number(params.get("steps") || "0")));
  const frozenTime = Number(params.get("time") || "1.6");
  return { shot, levelIndex, wells, ghost, steps, frozenTime };
}

function parsePointList(text) {
  if (!text) return [];
  return text
    .split(";")
    .map((part) => parseSinglePoint(part))
    .filter((point) => point !== null);
}

function parseSinglePoint(text) {
  if (!text) return null;
  const parts = text.split(",");
  if (parts.length !== 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function advanceCometToStep(level, wells, steps) {
  const state = createCometState(level);
  const trail = [{ x: state.x, y: state.y }];
  let advanced = 0;
  while (advanced < steps && state.status === "flying") {
    stepComet(state, level, wells);
    advanced += 1;
    if (advanced % 2 === 0) trail.push({ x: state.x, y: state.y });
  }
  while (trail.length > 220) trail.shift();
  return {
    state,
    trail,
    flightSeconds: advanced * SIM_DT,
    advancedSteps: advanced,
  };
}

export function stagedCampaignStats() {
  return {
    starsGathered: 33,
    starsTotal: 33,
    fuelRemainingTotal: 41.6,
    wellsUsedTotal: 21,
    totalScore: 4210,
    flightSecondsTotal: 132.4,
    levelsWon: 10,
  };
}
